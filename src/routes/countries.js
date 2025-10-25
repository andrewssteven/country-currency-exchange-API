const express = require("express");
const router = express.Router();
const axios = require("axios");
const { Country, Meta, sequelize } = require("../models");
const { Op, fn, col, where } = require("sequelize");
const path = require("path");
const fs = require("fs");
const generateSummaryImage = require("../utils/image");

// Optional: seed route for local testing. Inserts a small sample set and returns count.
router.post("/seed", async (req, res) => {
  try {
    const sample =
      req.body && Array.isArray(req.body)
        ? req.body
        : [
            {
              name: "Testland",
              capital: "Test City",
              region: "Africa",
              population: 1000000,
              flag_url: "https://flag.test/test.svg",
              currency_code: "TST",
              exchange_rate: 2,
              estimated_gdp: 500000,
              last_refreshed_at: new Date(),
            },
            {
              name: "Nocoin",
              capital: "Null City",
              region: "Europe",
              population: 500000,
              flag_url: "https://flag.test/nc.svg",
              currency_code: null,
              exchange_rate: null,
              estimated_gdp: 0,
              last_refreshed_at: new Date(),
            },
            {
              name: "Richland",
              capital: "Gold",
              region: "Asia",
              population: 2000000,
              flag_url: "https://flag.test/rl.svg",
              currency_code: "RCH",
              exchange_rate: 0.5,
              estimated_gdp: 4000000,
              last_refreshed_at: new Date(),
            },
          ];

    // clear and insert sample for deterministic local testing (Sequelize)
    await Country.destroy({ where: {} });
    const docs = await Country.bulkCreate(
      sample.map((s) => ({
        name: s.name,
        capital: s.capital || null,
        region: s.region || null,
        population: s.population,
        flag_url: s.flag || s.flag_url || null,
        currency_code: s.currency_code || null,
        exchange_rate: s.exchange_rate || null,
        estimated_gdp: s.estimated_gdp || null,
        last_refreshed_at: s.last_refreshed_at || new Date(),
      }))
    );
    await Meta.upsert({
      key: "last_refreshed_at",
      value: new Date().toISOString(),
    });
    res.json({ inserted: docs.length });
  } catch (err) {
    console.error("/countries/seed error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toISOStringSafe(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  // handle plain objects with toISOString
  if (value && typeof value.toISOString === "function") {
    try {
      return value.toISOString();
    } catch (e) {
      // fallthrough
    }
  }
  // try constructing a Date from strings/numbers
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

// POST /countries/refresh
router.post("/refresh", async (req, res) => {
  const countriesApi =
    "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies";
  const ratesApi = "https://open.er-api.com/v6/latest/USD";

  try {
    // Fetch both APIs in parallel
    const [countriesResp, ratesResp] = await Promise.all([
      axios.get(countriesApi, { timeout: 15000 }),
      axios.get(ratesApi, { timeout: 15000 }),
    ]);

    const countriesData = countriesResp.data;
    const ratesData = ratesResp.data;
    const fetchedCount = Array.isArray(countriesData)
      ? countriesData.length
      : 0;
    if (!Array.isArray(countriesData) || !ratesData || !ratesData.rates) {
      return res.status(503).json({
        error: "External data source unavailable",
        details: "Could not fetch data from external APIs",
      });
    }

    const rates = ratesData.rates;
    const now = new Date();

    // Run upserts in a transaction so we don't partially update on unexpected errors
    const results = [];
    let skippedInvalid = 0;
    await sequelize.transaction(async (tx) => {
      for (const c of countriesData) {
        const name = c.name;
        if (!name || typeof c.population !== "number") {
          // Skip invalid entries (per validation rules name & population required)
          skippedInvalid++;
          continue;
        }

        let currency_code = null;
        if (
          Array.isArray(c.currencies) &&
          c.currencies.length > 0 &&
          c.currencies[0] &&
          c.currencies[0].code
        ) {
          currency_code = c.currencies[0].code;
        }

        let exchange_rate = null;
        let estimated_gdp = null;

        if (!currency_code) {
          exchange_rate = null;
          estimated_gdp = 0;
        } else if (
          !Object.prototype.hasOwnProperty.call(rates, currency_code)
        ) {
          exchange_rate = null;
          estimated_gdp = null;
        } else {
          exchange_rate = rates[currency_code];
          const multiplier = Math.random() * 1000 + 1000;
          if (exchange_rate && exchange_rate !== 0) {
            estimated_gdp = (c.population * multiplier) / exchange_rate;
          } else {
            estimated_gdp = null;
          }
        }

        // Upsert by case-insensitive name
        const existing = await Country.findOne({
          where: where(fn("lower", col("name")), name.toLowerCase()),
          transaction: tx,
        });

        if (existing) {
          await existing.update(
            {
              name,
              capital: c.capital || null,
              region: c.region || null,
              population: c.population,
              currency_code,
              exchange_rate,
              estimated_gdp,
              flag_url: c.flag || null,
              last_refreshed_at: now,
            },
            { transaction: tx }
          );
          results.push(existing);
        } else {
          const created = await Country.create(
            {
              name,
              capital: c.capital || null,
              region: c.region || null,
              population: c.population,
              currency_code,
              exchange_rate,
              estimated_gdp,
              flag_url: c.flag || null,
              last_refreshed_at: now,
            },
            { transaction: tx }
          );
          results.push(created);
        }
      }

      // Update meta last_refreshed_at
      await Meta.upsert(
        { key: "last_refreshed_at", value: now.toISOString() },
        { transaction: tx }
      );
    });

    // After successful transaction, generate summary image and compute top5
    const total = await Country.count();
    const top5 = await Country.findAll({
      where: { estimated_gdp: { [Op.ne]: null } },
      order: [["estimated_gdp", "DESC"]],
      limit: 5,
    });

    // Ensure cache dir exists
    const cacheDir = path.join(__dirname, "..", "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    await generateSummaryImage(path.join(cacheDir, "summary.png"), {
      total,
      top5: top5.map((t) => ({ name: t.name, estimated_gdp: t.estimated_gdp })),
      last_refreshed_at: new Date().toISOString(),
    });

    console.log(
      `[countries/refresh] fetched=${fetchedCount} skipped=${skippedInvalid} upserted=${results.length}`
    );
    res.json({
      updated: results.length,
      fetched: fetchedCount,
      skipped: skippedInvalid,
      last_refreshed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Refresh failed", err && err.message ? err.message : err);
    // Distinguish external failures and try to indicate which API failed
    let details = "Could not fetch data from external API";
    if (err && err.config && err.config.url) {
      const url = err.config.url;
      if (url.includes("restcountries.com")) {
        details = "Could not fetch data from restcountries API";
      } else if (url.includes("open.er-api.com")) {
        details = "Could not fetch data from exchange rates API";
      }
    } else if (err && err.isAxiosError) {
      details = "Could not fetch data from external API";
    }

    if (err && (err.isAxiosError || (err.config && err.config.url))) {
      return res.status(503).json({
        error: "External data source unavailable",
        details,
      });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /countries with filters
router.get("/", async (req, res) => {
  try {
    const { region, currency, sort } = req.query;
    const filter = {};
    if (region) filter.region = region;
    if (currency) filter.currency_code = currency;

    // Build Sequelize where clause
    const whereClause = {};
    if (filter.region) whereClause.region = filter.region;
    if (filter.currency_code) whereClause.currency_code = filter.currency_code;

    const findOptions = { where: whereClause, raw: true };
    if (sort === "gdp_desc") findOptions.order = [["estimated_gdp", "DESC"]];

    const list = await Country.findAll(findOptions);
    res.json(
      list.map((c) => ({
        id: c.id,
        name: c.name,
        capital: c.capital,
        region: c.region,
        population: c.population,
        currency_code: c.currency_code,
        exchange_rate: c.exchange_rate,
        estimated_gdp: c.estimated_gdp,
        flag_url: c.flag_url,
        last_refreshed_at: toISOStringSafe(c.last_refreshed_at),
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DEBUG: return count and few sample docs to help diagnose empty results
router.get("/debug", async (req, res) => {
  try {
    const total = await Country.count();
    const sample = await Country.findAll({ limit: 5, raw: true });
    return res.json({ total, sample });
  } catch (err) {
    console.error("/countries/debug error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /countries/:name
router.get("/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const country = await Country.findOne({
      where: where(fn("lower", col("name")), name.toLowerCase()),
      raw: true,
    });
    if (!country) return res.status(404).json({ error: "Country not found" });
    res.json({
      id: country.id,
      name: country.name,
      capital: country.capital,
      region: country.region,
      population: country.population,
      currency_code: country.currency_code,
      exchange_rate: country.exchange_rate,
      estimated_gdp: country.estimated_gdp,
      flag_url: country.flag_url,
      last_refreshed_at: toISOStringSafe(country.last_refreshed_at),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /countries/:name
router.delete("/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const deleted = await Country.destroy({
      where: where(fn("lower", col("name")), name.toLowerCase()),
    });
    if (!deleted) return res.status(404).json({ error: "Country not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// (debug route moved above dynamic name route to avoid routing collision)

module.exports = router;
