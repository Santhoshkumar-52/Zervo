import api from "../axios";

// GET /api/payment
// The active payment methods of the logged-in user's branch.
// Response: { success, message, data: { payments: [{ id, payment_name, ... }] } }
export const getPayments = () =>
  api.get("/payment").then((res) => res.data.data.payments);