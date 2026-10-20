import api from "../axios";

// GET /api/dashboard
// params: { start_date, end_date }  YYYY-MM-DD, both days included (required)
// The server uses the logged-in user's branch.
// Response: { success, message, data: { subscriptions } }
//   subscriptions: [{ date, value }]  (subscriptions per day)
export const getDashboard = (params = {}) =>
  api.get("/dashboard", { params }).then((res) => res.data.data);
