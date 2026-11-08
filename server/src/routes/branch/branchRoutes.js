const express = require("express");

const { getBranches } = require("../../controller/branchController/controller");

const router = express.Router();

// tokenVerify is applied in routes/index.js. The controller itself checks that
// the user's group id is 1 (owner) before it returns anything.
//
// GET /api/branch -> every branch (active and inactive); 403 unless group 1
//                    Response: { data: { branches: [{ id, name, code, ... }] } }
router.get("/", getBranches);

module.exports = router;
