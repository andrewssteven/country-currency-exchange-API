const mongoose = require("mongoose");

const MetaSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
});

module.exports = mongoose.model("Meta", MetaSchema);
