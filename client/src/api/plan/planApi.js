import api from "../axios";

// All plan endpoints take the plan's internal `id`.
// `price_minor` is the price in minor units (paise), e.g. ₹1500 -> 150000.

// GET /api/plan
// params: { page, limit, search, planActive }
// Response: { success, message, data: { plans: [], pagination: {} } }
export const getPlans = (params = {}) => {
  // Drop empty values so we never send ?search=&planActive=undefined
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api.get("/plan", { params: cleanParams });
};

// GET /api/plan/:id
// Response: { success, message, data: { plan } }
export const getPlanById = (id) => api.get(`/plan/${id}`);

// POST /api/plan
// body: { name, duration_days, price_minor, max_freeze_days?, is_active? }
// Response: { success, message, data: { plan } }
export const createPlan = (payload) => api.post("/plan", payload);

// PATCH /api/plan/:id
// body (any of): { name, duration_days, price_minor, max_freeze_days, is_active }
export const updatePlan = (id, payload) => api.patch(`/plan/${id}`, payload);

// PATCH /api/plan/:id/status   body: { is_active: boolean }
export const updatePlanStatus = (id, isActive) =>
  api.patch(`/plan/${id}/status`, { is_active: isActive });

// DELETE /api/plan/:id   (soft delete)
export const deletePlan = (id) => api.delete(`/plan/${id}`);
