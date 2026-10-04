import api from "../axios";

// All tax endpoints take the tax's internal `id`.

// GET /api/tax
// params: { page, limit, search, taxActive }
// Response: { success, message, data: { taxes: [], pagination: {} } }
export const getTaxes = (params = {}) => {
  // Drop empty values so we never send ?search=&taxActive=undefined
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api.get("/tax", { params: cleanParams });
};

// GET /api/tax/:id
// Response: { success, message, data: { tax } }
export const getTaxById = (id) => api.get(`/tax/${id}`);

// POST /api/tax
// body: { name, rate, description?, is_active? }
// Response: { success, message, data: { tax } }
export const createTax = (payload) => api.post("/tax", payload);

// PATCH /api/tax/:id
// body (any of): { name, rate, description, is_active }
export const updateTax = (id, payload) => api.patch(`/tax/${id}`, payload);

// PATCH /api/tax/:id/status   body: { is_active: boolean }
export const updateTaxStatus = (id, isActive) =>
  api.patch(`/tax/${id}/status`, { is_active: isActive });

// DELETE /api/tax/:id   (soft delete)
export const deleteTax = (id) => api.delete(`/tax/${id}`);
