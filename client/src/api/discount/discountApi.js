import api from "../axios";

// All discount endpoints take the discount's internal `id`.
// `type` is 1 (percentage) or 2 (fixed); the server saves `type_name` itself.

// GET /api/discount
// params: { page, limit, search, discountActive, type }
// Response: { success, message, data: { discounts: [], pagination: {} } }
export const getDiscounts = (params = {}) => {
  // Drop empty values so we never send ?search=&type=undefined
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api.get("/discount", { params: cleanParams });
};

// GET /api/discount/:id
// Response: { success, message, data: { discount } }
export const getDiscountById = (id) => api.get(`/discount/${id}`);

// POST /api/discount
// body: { name, type, value, description?, is_active?, starts_on?, ends_on? }
// Response: { success, message, data: { discount } }
export const createDiscount = (payload) => api.post("/discount", payload);

// PATCH /api/discount/:id
// body (any of): { name, type, value, description, is_active, starts_on, ends_on }
export const updateDiscount = (id, payload) =>
  api.patch(`/discount/${id}`, payload);

// PATCH /api/discount/:id/status   body: { is_active: boolean }
export const updateDiscountStatus = (id, isActive) =>
  api.patch(`/discount/${id}/status`, { is_active: isActive });

// DELETE /api/discount/:id   (soft delete)
export const deleteDiscount = (id) => api.delete(`/discount/${id}`);
