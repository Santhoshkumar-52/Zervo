const express = require("express");

const {
  getmembers,
  getMemberById,
  createMember,
  updateMember,
  updateMemberStatus,
  deleteMember,
} = require("../../controller/memberController/controller");
const authorizeRoles = require("../../middleware/auth/authorizeRoles");

const router = express.Router();

// Front desk can edit members; only owners and managers can delete them.
const canEditMembers = authorizeRoles("owner", "manager", "front_desk");
const canDeleteMembers = authorizeRoles("owner", "manager");

// GET    /api/member             -> paginated list (page, limit, search, memberActive, branchActive)
// GET    /api/member/:id         -> one member (used to load the edit form)
// POST   /api/member             -> create (member_Id generated, branch from logged-in user)
// PATCH  /api/member/:id         -> update details
// PATCH  /api/member/:id/status  -> toggle active / inactive, body: { is_active }
// DELETE /api/member/:id         -> soft delete (sets deleted_at + deleted_by)
router.get("/", getmembers);
router.post("/", canEditMembers, createMember);
router.get("/:id", getMemberById);
router.patch("/:id/status", canEditMembers, updateMemberStatus);
router.patch("/:id", canEditMembers, updateMember);
router.put("/:id", canEditMembers, updateMember);
router.delete("/:id", canDeleteMembers, deleteMember);

module.exports = router;
