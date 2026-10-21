const express = require("express");

const {
  getAttendanceReport,
  getStaffAttendanceReport,
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

// GET /api/report/staff-attendance?page=1&limit=10&search= -> paginated staff check-ins of a date range
//     same date range as above; search matches user ID, name, email or group name.
//     -> { records, pagination }
router.get("/staff-attendance", getStaffAttendanceReport);

module.exports = router;
