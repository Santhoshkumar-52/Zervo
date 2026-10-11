const express = require("express");
const cors = require("cors");
const app = express();
const router = require("./routes/index");
const testDatabase = require("./src/config/testdatabase");
const { successResponse, errorResponse } = require("./utils/response");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "zervo backend is running",
  });
});
app.get("/api/health/db", async (req, res) => {
  try {
    await testDatabase();
    successResponse(res, 200, "Database connection is healthy");
  } catch (err) {
    console.log(err.message);
    errorResponse(res, 500, "Database connection failed", err.message);
  }
});

module.exports = app;
