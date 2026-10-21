const express = require("express");

const {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  updateGroupStatus,
  deleteGroup,
} = require("../../controller/groupController/controller");
const authorizeRoles = require("../../middleware/auth/authorizeRoles");

const router = express.Router();

// Groups are the staff roles, so only the owner (group 1) can change them.
// Reading is open to every logged-in user (tokenVerify is applied in routes/index.js).
const canManageGroups = authorizeRoles(1);

// GET    /api/group             -> paginated list (page, limit, search, groupActive)
// GET    /api/group/:id         -> one group (used to load the edit form)
// POST   /api/group             -> create
// PATCH  /api/group/:id         -> update details
// PATCH  /api/group/:id/status  -> toggle active / inactive, body: { is_active }
// DELETE /api/group/:id         -> soft delete (sets deleted_at + deleted_by)
router.get("/", getGroups);
router.post("/", canManageGroups, createGroup);
router.get("/:id", getGroupById);
router.patch("/:id/status", canManageGroups, updateGroupStatus);
router.patch("/:id", canManageGroups, updateGroup);
router.put("/:id", canManageGroups, updateGroup);
router.delete("/:id", canManageGroups, deleteGroup);

module.exports = router;
