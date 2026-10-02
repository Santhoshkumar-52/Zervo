const express = require("express");

const {
  login,
  register,
} = require("../../controller/authController/controller");

const router = express.Router();

// POST /api/v1/auth/login
router.post("/login", login);
router.post("/register", register);

module.exports = router;
