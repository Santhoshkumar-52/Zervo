import api from "../axios";

// All staff endpoints take the staff member's internal `id` (not `user_id`).

// GET /api/staff
// params: { page, limit, search, role, isActive }
// Response: { success, message, data: { staff: [], pagination: {} } }
export const getStaff = (params = {}) => {
  // Drop empty values so we never send ?search=&role=undefined
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api.get("/staff", { params: cleanParams });
};

// GET /api/staff/:id
// Response: { success, message, data: { staff } }
export const getStaffById = (id) => api.get(`/staff/${id}`);

// POST /api/staff
// body: { user_id, full_name, email, password, role?, is_active?, avatar_url? }
// Response: { success, message, data: { staff } }
export const createStaff = (payload) => api.post("/staff", payload);

// PATCH /api/staff/:id   (any of: full_name, email, password, role, is_active, avatar_url)
export const updateStaff = (id, payload) => api.patch(`/staff/${id}`, payload);

// PATCH /api/staff/:id/status   body: { is_active: boolean }
export const updateStaffStatus = (id, isActive) =>
  api.patch(`/staff/${id}/status`, { is_active: isActive });

// DELETE /api/staff/:id   (soft delete)
export const deleteStaff = (id) => api.delete(`/staff/${id}`);
