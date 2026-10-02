const express = require("express");

const {
  login,
  register,
  refreshToken,
} = require("../../controller/authController/controller");

const router = express.Router();

// POST /api/v1/auth/login
router.post("/login", login);
router.post("/register", register);
router.post("/refresh", refreshToken);
module.exports = router;
