import api from "../axios";

// GET /api/member
// params: { page, limit, search, memberActive, branchActive }
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

// NOTE: the server currently only implements GET /member.
// The two calls below assume these endpoints will be added:

// PATCH /api/member/:id/status   body: { is_active: boolean }
export const updateMemberStatus = (id, isActive) =>
  api.patch(`/member/${id}/status`, { is_active: isActive });

// DELETE /api/member/:id
export const deleteMember = (id) => api.delete(`/member/${id}`);

// PATCH /api/member/:id
// body: { first_name, last_name, phone, email, joined_on, assigned_trainer_id, is_active }
// NOTE: not implemented on the server yet.
export const updateMember = (id, payload) => api.patch(`/member/${id}`, payload);
