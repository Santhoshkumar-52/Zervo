const express = require("express");

const {
  getStaffList,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
} = require("../../controller/staffController/controller");
const authorizeRoles = require("../../middleware/auth/authorizeRoles");

const router = express.Router();

// Only owners and managers can change staff.
const canManageStaff = authorizeRoles("owner", "manager");

// GET    /api/staff        -> paginated list (page, limit, search, role, isActive)
// GET    /api/staff/:id    -> one staff member
// POST   /api/staff        -> create (user_id comes from the request body)
// PUT    /api/staff/:id    -> update (matched on id + branch_id)
// DELETE /api/staff/:id    -> delete (matched on id + branch_id)
router.get("/", getStaffList);
router.get("/:id", getStaffById);
router.post("/", canManageStaff, createStaff);
router.put("/:id", canManageStaff, updateStaff);
router.patch("/:id", canManageStaff, updateStaff);
router.delete("/:id", canManageStaff, deleteStaff);

module.exports = router;
