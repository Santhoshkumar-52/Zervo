const db = require("./database");

const testDatabase = async () => {
  try {
    await db.raw("SELECT 1");

    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed");
    console.error(error.message);

    process.exit(1);
  }
};

module.exports = testDatabase;
