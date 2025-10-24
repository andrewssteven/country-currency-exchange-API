const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/countries_db";
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
    app.listen(PORT, () =>
      console.log(`Server listening on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { start };
