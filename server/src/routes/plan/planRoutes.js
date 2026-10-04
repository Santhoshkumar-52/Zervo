const express = require("express");

const {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  updatePlanStatus,
  deletePlan,
} = require("../../controller/planController/controller");
const authorizeRoles = require("../../middleware/auth/authorizeRoles");

const router = express.Router();

// Plan prices affect billing, so only owners and managers can change them.
const canManagePlans = authorizeRoles();

// GET    /api/plan             -> paginated list (page, limit, search, planActive)
// GET    /api/plan/:id         -> one plan (used to load the edit form)
// POST   /api/plan             -> create (branch from logged-in user)
// PATCH  /api/plan/:id         -> update details
// PATCH  /api/plan/:id/status  -> toggle active / inactive, body: { is_active }
// DELETE /api/plan/:id         -> soft delete (sets deleted_at + deleted_by)
router.get("/", getPlans);
router.post("/", canManagePlans, createPlan);
router.get("/:id", getPlanById);
router.patch("/:id/status", canManagePlans, updatePlanStatus);
router.patch("/:id", canManagePlans, updatePlan);
router.put("/:id", canManagePlans, updatePlan);
router.delete("/:id", canManagePlans, deletePlan);

module.exports = router;
