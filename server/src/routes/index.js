const express = require("express");

const authRoutes = require("./auth/authRoute");
const { getDemoUsers } = require("./demo/demoRoutes");
const tokenVerify = require("../middleware/auth/tokenverify");
const memberRoutes = require("./member/memberRoutes");
const staffRoutes = require("./staff/staffRoutes");
const taxRoutes = require("./tax/taxRoutes");
const planRoutes = require("./plan/planRoutes");
const discountRoutes = require("./discount/discountRoutes");
const subscriptionRoutes = require("./subscription/subscriptionRoutes");
const paymentRoutes = require("./payment/paymentRoutes");
const reportRoutes = require("./report/reportRoutes");
const initRoutes = require("./init/initRoutes");
const dashboardRoutes = require("./dashboard/dashboardRoutes");

const router = express.Router();

// Authentication routes
router.use("/auth", authRoutes);
router.get("/demo", tokenVerify, getDemoUsers);
router.use("/member", tokenVerify, memberRoutes);
router.use("/staff", tokenVerify, staffRoutes);
router.use("/tax", tokenVerify, taxRoutes);
router.use("/plan", tokenVerify, planRoutes);
router.use("/discount", tokenVerify, discountRoutes);
router.use("/subscription", tokenVerify, subscriptionRoutes);
router.use("/payment", tokenVerify, paymentRoutes);
router.use("/report", tokenVerify, reportRoutes);
router.use("/init", tokenVerify, initRoutes);
router.use("/dashboard", tokenVerify, dashboardRoutes);

// Future feature routes
// router.use("/users", userRoutes);
// router.use("/members", memberRoutes);
// router.use("/attendance", attendanceRoutes);

module.exports = router;
