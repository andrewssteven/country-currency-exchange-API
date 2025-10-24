const mongoose = require("mongoose");

const CountrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    capital: { type: String, default: null },
    region: { type: String, default: null },
    population: { type: Number, required: true },
    currency_code: { type: String, default: null },
    exchange_rate: { type: Number, default: null },
    estimated_gdp: { type: Number, default: null },
    flag_url: { type: String, default: null },
    last_refreshed_at: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Country", CountrySchema);
