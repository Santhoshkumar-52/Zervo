const express = require("express");

const { getDashboard } = require("../../controller/dashboardController/controller");

const router = express.Router();

// GET /api/dashboard?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
//     body: { start_date, end_date } also works (both days included)
//     -> { subscriptions: [{ date, value }] } for the logged-in user's branch
router.get("/", getDashboard);

module.exports = router;
