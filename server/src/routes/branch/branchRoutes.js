const express = require("express");

const {
  getBranches,
  updateBranch,
} = require("../../controller/branchController/controller");

const router = express.Router();

// tokenVerify is applied in routes/index.js. The controllers themselves check
// that the user's group id is 1 (owner) before they return or change anything.
//
// GET   /api/branch     -> every branch (active and inactive); 403 unless group 1
//                          Response: { data: { branches: [{ id, name, code, ... }] } }
// PATCH /api/branch/:id -> update one branch; 403 unless group 1
//                          body (any of): { name, code, logo, attend_background,
//                          address, phone, currency, subbill_url, receipt_url,
//                          is_active }
//                          Response: { data: { branch } }
router.get("/", getBranches);
router.patch("/:id", updateBranch);

module.exports = router;
