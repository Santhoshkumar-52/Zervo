const express = require("express");

const { getInitData } = require("../../controller/initController/controller");

const router = express.Router();

// GET /api/init -> everything the client needs right after login
//                  Response: { data: { branches: [{ id, name, code, ... }] } }
router.get("/", getInitData);

module.exports = router;
