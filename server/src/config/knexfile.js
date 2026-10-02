
const knexConfig = require("./connection");
const nodeEnv = process.env.NODE_ENV || "development";
console.log("Using Environment:",nodeEnv);

const db = require("knex")(knexConfig[nodeEnv]);
module.exports = db;
