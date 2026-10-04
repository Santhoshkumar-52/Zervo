import api from "../axios";

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
export const getStaffById = (id) => api.get(`/staff/${id}`);

// POST /api/staff
// body: { user_id, full_name, email, password, role?, is_active?, avatar_url? }
export const createStaff = (payload) => api.post("/staff", payload);

// PATCH /api/staff/:id   (any of: full_name, email, password, role, is_active, avatar_url)
export const updateStaff = (id, payload) => api.patch(`/staff/${id}`, payload);

// Convenience wrapper used by the status switch.
export const updateStaffStatus = (id, isActive) =>
  updateStaff(id, { is_active: isActive });

// DELETE /api/staff/:id
export const deleteStaff = (id) => api.delete(`/staff/${id}`);
