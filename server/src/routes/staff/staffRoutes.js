const express = require("express");

const {
  getStaffList,
  getStaffById,
  createStaff,
  updateStaff,
  updateStaffStatus,
  deleteStaff,
} = require("../../controller/staffController/controller");
const authorizeRoles = require("../../middleware/auth/authorizeRoles");

const router = express.Router();

// Only owners and managers can change staff.
const canManageStaff = authorizeRoles("owner", "manager");

// GET    /api/staff             -> paginated list (page, limit, search, role, isActive)
// GET    /api/staff/:id         -> one staff member (used to load the edit form)
// POST   /api/staff             -> create (user_id from body, created_by = logged-in user)
// PATCH  /api/staff/:id         -> update details
// PATCH  /api/staff/:id/status  -> toggle active / inactive, body: { is_active }
// DELETE /api/staff/:id         -> soft delete (sets deleted_at + deleted_by)
router.get("/", getStaffList);
router.post("/", canManageStaff, createStaff);
router.get("/:id", getStaffById);
router.patch("/:id/status", canManageStaff, updateStaffStatus);
router.patch("/:id", canManageStaff, updateStaff);
router.put("/:id", canManageStaff, updateStaff);
router.delete("/:id", canManageStaff, deleteStaff);

module.exports = router;
