const express = require("express");

const {
  getTaxes,
  getTaxById,
} = require("../../controller/taxController/controller");

const router = express.Router();

// GET /api/tax       -> paginated list (page, limit, search, taxActive)
// GET /api/tax/:id   -> one tax
router.get("/", getTaxes);
router.get("/:id", getTaxById);

module.exports = router;
