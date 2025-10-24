require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");

const countriesRouter = require("./routes/countries");

const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

// Serve summary image if present (registered before the countries router so '/countries/image' is handled)
app.get("/countries/image", (req, res) => {
  const fs = require("fs");
  const primary = path.join(__dirname, "..", "cache", "summary.png");
  const secondary = path.join(__dirname, "cache", "summary.png");
  let imgPath = null;
  if (fs.existsSync(primary)) imgPath = primary;
  else if (fs.existsSync(secondary)) imgPath = secondary;

  if (!imgPath) {
    return res.status(404).json({ error: "Summary image not found" });
  }
  return res.sendFile(imgPath);
});

app.use("/countries", countriesRouter);

// status endpoint
const Meta = require("./models/meta");
app.get("/status", async (req, res) => {
  try {
    const total = await require("./models/country").countDocuments();
    const meta = await Meta.findOne({ key: "last_refreshed_at" });
    res.json({
      total_countries: total,
      last_refreshed_at: meta ? meta.value : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = app;
