const express = require("express");

const {
  getTaxes,
  getTaxById,
  createTax,
  updateTax,
  updateTaxStatus,
  deleteTax,
} = require("../../controller/taxController/controller");
const authorizeRoles = require("../../middleware/auth/authorizeRoles");

const router = express.Router();

// Tax rates affect billing, so only owners and managers can change them.
const canManageTaxes = authorizeRoles(1, 2);

// GET    /api/tax             -> paginated list (page, limit, search, taxActive)
// GET    /api/tax/:id         -> one tax (used to load the edit form)
// POST   /api/tax             -> create (branch from logged-in user)
// PATCH  /api/tax/:id         -> update details
// PATCH  /api/tax/:id/status  -> toggle active / inactive, body: { is_active }
// DELETE /api/tax/:id         -> soft delete (sets deleted_at + deleted_by)
router.get("/", getTaxes);
router.post("/", canManageTaxes, createTax);
router.get("/:id", getTaxById);
router.patch("/:id/status", canManageTaxes, updateTaxStatus);
router.patch("/:id", canManageTaxes, updateTax);
router.put("/:id", canManageTaxes, updateTax);
router.delete("/:id", canManageTaxes, deleteTax);

module.exports = router;
