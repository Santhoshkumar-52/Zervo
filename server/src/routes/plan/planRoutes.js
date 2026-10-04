const express = require("express");

const {
  getPlans,
  getPlanById,
} = require("../../controller/planController/controller");

const router = express.Router();

// GET /api/plan       -> paginated list (page, limit, search, planActive)
// GET /api/plan/:id   -> one plan
router.get("/", getPlans);
router.get("/:id", getPlanById);

module.exports = router;
