const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

// If running tests, use sqlite in-memory for speed and isolation
let sequelize;
if (process.env.NODE_ENV === "test") {
  sequelize = new Sequelize("sqlite::memory:", { logging: false });
} else {
  // Use MySQL by default; fall back to sqlite file if MYSQL_* not provided
  const host = process.env.MYSQL_HOST || "localhost";
  const port = process.env.MYSQL_PORT || 3306;
  const database =
    process.env.MYSQL_DATABASE || process.env.MYSQL_DB || "countries_db";
  const username =
    process.env.MYSQL_USER || process.env.MYSQL_USERNAME || "root";
  const password = process.env.MYSQL_PASSWORD || "";

  sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: "mysql",
    logging: false,
  });
}

const Country = require("./country")(sequelize, DataTypes);
const Meta = require("./meta")(sequelize, DataTypes);

module.exports = {
  sequelize,
  Sequelize,
  Country,
  Meta,
};
