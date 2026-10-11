const express = require("express");

const {
  getPayments,
} = require("../../controller/paymentController/controller");

const router = express.Router();

// GET /api/payment -> active payment methods of the logged-in user's branch
//                     Response: { data: { payments: [{ id, payment_name, ... }] } }
router.get("/", getPayments);

module.exports = router;