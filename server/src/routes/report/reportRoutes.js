const express = require("express");

const {
  getAttendanceReport,
} = require("../../controller/reportController/controller");
const authorizeRoles = require("../../middleware/auth/authorizeRoles");

const router = express.Router();

// Only these roles (group ids) may open any report. Applied to the whole
// router so every report added later is protected the same way.
router.use(authorizeRoles(1, 2, 3));

// GET /api/report/attendance?page=1&limit=10&search= -> paginated member check-ins of a date range
//     body: { start_date, end_date } (YYYY-MM-DD, both days included), or the
//     same two fields in the query string for clients that cannot send a GET body
//     search matches member_Id, phone or name; roles 1, 2 and 3 only.
//     -> { records, pagination }
router.get("/attendance", getAttendanceReport);

module.exports = router;
