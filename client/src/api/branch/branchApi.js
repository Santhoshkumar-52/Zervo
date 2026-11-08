import api from "../axios";

// GET /api/branch
// Every branch, active and inactive, ordered by name. Only the owner (group 1)
// may call it; anyone else gets 403.
// Response: { success, message, data: { branches: [{ id, name, code, logo,
//   attend_background, address, phone, currency, subbill_url, receipt_url,
//   is_active, created_at, updated_at }] } }
export const getBranchList = () =>
  api.get("/branch").then((res) => res.data.data);
