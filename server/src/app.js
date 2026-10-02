const express = require("express");

const app = express();
const router = require("./routes/index");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "zervo backend is running",
  });
});

module.exports = app;
