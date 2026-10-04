const express = require("express");
const { getmembers } = require("../../controller/memberController/controller");

const router = express.Router();

// POST /api/v1/auth/login
router.get("/", getmembers);

module.exports = router;
