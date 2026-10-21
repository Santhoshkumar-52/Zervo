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
      // directory: path.join(__dirname, "..", "config", "boilerseeds"),  //for default value alone
    },
    
  },

  production: {
    client: "mysql2",

    connection: {
      host: process.env.prod_DB_HOST,
      port: Number(process.env.prod_DB_PORT) || 3306,
      user: process.env.prod_DB_USER,
      password: process.env.prod_DB_PASSWORD,
      database: process.env.prod_DB_NAME,
    },

    migrations: {
      directory: path.join(__dirname, "..", "config", "migrations"),
    },

    seeds: {
      directory: path.join(__dirname, "..", "config", "seeds"),
    },
  },
};
