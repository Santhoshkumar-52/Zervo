import api from "../axios";

// GET /api/dashboard
// params: { start_date, end_date }  YYYY-MM-DD, both days included (required)
// The server uses the logged-in user's branch.
// Response: { success, message, data: { subscriptions, revenue, payment_modes, member_attendance, staff_attendance } }
//   subscriptions: { group_by, points }
//     group_by : "day" | "week" | "month" | "year" (chosen by the server from the range)
//     points   : [{ label, start_date, end_date, value }]  (label is ready for the x axis)
//   payment_modes: [{ id, name, count, amount }]  (amount in paise)
//   member_attendance: [{ key, name, count }]  one item per gender (member check-ins)
//   staff_attendance : [{ key, name, count, groups: [{ key, name, count }] }]
//     one item per gender (inner ring); groups = the staff groups (outer ring).
//     Counts are staff check-ins in the range.
export const getDashboard = (params = {}) =>
  api.get("/dashboard", { params }).then((res) => res.data.data);
