const express = require("express");

const authRoutes = require("./auth/authRoute");

const router = express.Router();

// Authentication routes
router.use("/auth", authRoutes);

// Future feature routes
// router.use("/users", userRoutes);
// router.use("/members", memberRoutes);
// router.use("/subscriptions", subscriptionRoutes);
// router.use("/payments", paymentRoutes);
// router.use("/attendance", attendanceRoutes);
// router.use("/dashboard", dashboardRoutes);

module.exports = router;
