import api from "../axios";

// GET /api/dashboard
// params: { start_date, end_date }  YYYY-MM-DD, both days included (required)
// The server uses the logged-in user's branch.
// Response: { success, message, data: { subscriptions } }
//   subscriptions: { group_by, points }
//     group_by : "day" | "week" | "month" | "year" (chosen by the server from the range)
//     points   : [{ label, start_date, end_date, value }]  (label is ready for the x axis)
export const getDashboard = (params = {}) =>
  api.get("/dashboard", { params }).then((res) => res.data.data);
