const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

module.exports = {
  development: {
    client: "mysql2",

    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },

    migrations: {
      directory: path.join(__dirname, "..", "config", "migrations"),
    },

    seeds: {
      directory: path.join(__dirname, "..", "config", "seeds"),
    },
  },

  production: {
    client: "mysql2",

    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },

    migrations: {
      directory: path.join(__dirname, "..", "db", "migrations"),
    },

    seeds: {
      directory: path.join(__dirname, "..", "db", "seeds"),
    },
  },
};
