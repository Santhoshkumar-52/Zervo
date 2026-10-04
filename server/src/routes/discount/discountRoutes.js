const express = require("express");

const {
  getDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  updateDiscountStatus,
  deleteDiscount,
} = require("../../controller/discountController/controller");
const authorizeRoles = require("../../middleware/auth/authorizeRoles");

const router = express.Router();

// Discounts affect billing, so only owners and managers can change them.
const canManageDiscounts = authorizeRoles();

// GET    /api/discount             -> paginated list (page, limit, search, discountActive, type: 1|2)
// GET    /api/discount/:id         -> one discount (used to load the edit form)
// POST   /api/discount             -> create (type 1|2; type_name is set by the server)
// PATCH  /api/discount/:id         -> update details
// PATCH  /api/discount/:id/status  -> toggle active / inactive, body: { is_active }
// DELETE /api/discount/:id         -> soft delete (sets deleted_at + deleted_by)
router.get("/", getDiscounts);
router.post("/", canManageDiscounts, createDiscount);
router.get("/:id", getDiscountById);
router.patch("/:id/status", canManageDiscounts, updateDiscountStatus);
router.patch("/:id", canManageDiscounts, updateDiscount);
router.put("/:id", canManageDiscounts, updateDiscount);
router.delete("/:id", canManageDiscounts, deleteDiscount);

module.exports = router;
