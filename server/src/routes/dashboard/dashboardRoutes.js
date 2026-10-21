const express = require("express");

const { getDashboard } = require("../../controller/dashboardController/controller");

const router = express.Router();

// GET /api/dashboard?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
//     body: { start_date, end_date } also works (both days included)
//     -> { subscriptions: { group_by, points },
//          revenue: { group_by, points, series } }
//        for the logged-in user's branch. The points are grouped by day, week, month
//        or year depending on the length of the range.
router.get("/", getDashboard);

module.exports = router;
