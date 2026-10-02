const knex = require("knex");
const dotenv = require("dotenv");

dotenv.config();
const db = knex({
  client: process.env.DB_CLIENT || "mysql2",

  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  pool: {
    min: 2,
    max: 10,
  },
});

module.exports = db;
