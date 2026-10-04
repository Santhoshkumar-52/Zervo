const express = require("express");

const authRoutes = require("./auth/authRoute");
const { getDemoUsers } = require("./demo/demoRoutes");
const tokenVerify = require("../middleware/auth/tokenverify");
const memberRoutes = require("./member/memberRoutes");
const staffRoutes = require("./staff/staffRoutes");
const taxRoutes = require("./tax/taxRoutes");
const planRoutes = require("./plan/planRoutes");
const discountRoutes = require("./discount/discountRoutes");

const router = express.Router();

// Authentication routes
router.use("/auth", authRoutes);
router.get("/demo", tokenVerify, getDemoUsers);
router.use("/member", tokenVerify, memberRoutes);
router.use("/staff", tokenVerify, staffRoutes);
router.use("/tax", tokenVerify, taxRoutes);
router.use("/plan", tokenVerify, planRoutes);
router.use("/discount", tokenVerify, discountRoutes);

// Future feature routes
// router.use("/users", userRoutes);
// router.use("/members", memberRoutes);
// router.use("/subscriptions", subscriptionRoutes);
// router.use("/payments", paymentRoutes);
// router.use("/attendance", attendanceRoutes);
// router.use("/dashboard", dashboardRoutes);

module.exports = router;
