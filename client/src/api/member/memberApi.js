import api from "../axios";

// All member endpoints take the member's internal `id` (not `member_Id`).

// GET /api/member
// params: { page, limit, search, memberId, memberActive, branchActive }
//   memberId: exact match on the member's own ID (members.member_Id)
// Response: { success, message, data: { members: [], pagination: {} } }
export const getMembers = (params = {}) => {
  // Drop empty values so we never send ?search=&memberActive=undefined
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api.get("/member", { params: cleanParams });
};

// GET /api/member/:id
// Response: { success, message, data: { member, subscription } }
//   subscription: the plan running today, else the most recent one, else null:
//   { bill_no, subscription_no, status ("active" | "upcoming" | "expired"),
//     start_date, end_date, days_left (active only, else null),
//     total_price (paise), items: [{ item_type, item_name, quantity,
//     start_date, end_date }] }
export const getMemberById = (id) => api.get(`/member/${id}`);

// POST /api/member
// body: { first_name, last_name?, phone, email?, joined_on, assigned_trainer_id?, is_active? }
// Response: { success, message, data: { member } }
export const createMember = (payload) => api.post("/member", payload);

// PATCH /api/member/:id/status   body: { is_active: boolean }
export const updateMemberStatus = (id, isActive) =>
  api.patch(`/member/${id}/status`, { is_active: isActive });

// DELETE /api/member/:id   (soft delete)
export const deleteMember = (id) => api.delete(`/member/${id}`);

// PATCH /api/member/:id
// body (any of): { first_name, last_name, phone, email, joined_on,
//                  assigned_trainer_id, is_active }
export const updateMember = (id, payload) => api.patch(`/member/${id}`, payload);
