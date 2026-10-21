import api from "../axios";

// GET /api/group
// params: { page, limit, search, groupActive }
// Response: { success, message, data: { groups: [], pagination: {} } }
//   group: { id, name, description, is_active, user_count, created_at, updated_at }
export const getGroups = (params = {}) => {
  // Drop empty values so we never send ?search=&groupActive=undefined
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api.get("/group", { params: cleanParams });
};

// GET /api/group/:id
// Response: { success, message, data: { group } }
export const getGroupById = (id) => api.get(`/group/${id}`);

// The calls below need the owner role (group 1).

// POST /api/group
// body: { name, description?, is_active? }
export const createGroup = (payload) => api.post("/group", payload);

// PATCH /api/group/:id
// body (any of): { name, description, is_active }
export const updateGroup = (id, payload) => api.patch(`/group/${id}`, payload);

// PATCH /api/group/:id/status   body: { is_active: boolean }
export const updateGroupStatus = (id, isActive) =>
  api.patch(`/group/${id}/status`, { is_active: isActive });

// DELETE /api/group/:id   (soft delete)
export const deleteGroup = (id) => api.delete(`/group/${id}`);
