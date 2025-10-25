const app = require("./app");
const { sequelize } = require("./models");

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Initialize DB. For tests we use sqlite in-memory via env NODE_ENV=test
    await sequelize.authenticate();
    await sequelize.sync();
    console.log("Connected to SQL database");
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
