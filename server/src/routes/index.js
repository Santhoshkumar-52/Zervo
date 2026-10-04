const express = require("express");

const authRoutes = require("./auth/authRoute");
const { getDemoUsers } = require("./demo/demoRoutes");
const tokenVerify = require("../middleware/auth/tokenverify");
const memberRoutes = require("./member/memberRoutes");

const router = express.Router();

// Authentication routes
router.use("/auth", authRoutes);
router.get("/demo", tokenVerify, getDemoUsers);
router.use("/member", tokenVerify, memberRoutes);

// Future feature routes
// router.use("/users", userRoutes);
// router.use("/members", memberRoutes);
// router.use("/subscriptions", subscriptionRoutes);
// router.use("/payments", paymentRoutes);
// router.use("/attendance", attendanceRoutes);
// router.use("/dashboard", dashboardRoutes);

module.exports = router;
