const express = require("express");

const {
  getDiscounts,
  getDiscountById,
} = require("../../controller/discountController/controller");

const router = express.Router();

// GET /api/discount       -> paginated list (page, limit, search, discountActive, type)
// GET /api/discount/:id   -> one discount
router.get("/", getDiscounts);
router.get("/:id", getDiscountById);

module.exports = router;
