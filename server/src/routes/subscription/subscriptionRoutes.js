const express = require("express");

const {
  getBillItems,
  addBillItem,
} = require("../../controller/subscriptionController/controller");

const router = express.Router();

// The bill being built by the logged-in user. The client only sends the plan,
// tax and discount choices; the server calculates the amounts.
//
// GET  /api/subscription/items?bill_no= -> { bill_no, items, totals }
// POST /api/subscription/items -> save one item, returns the whole bill
//      body: { bill_no?, member_id, plan_id, tax_id | null, discount_type,
//              discount_value, bill_date, start_date }
//      No bill_no starts a new bill; send the returned bill_no to add more items.
router.get("/items", getBillItems);
router.post("/items", addBillItem);

module.exports = router;
