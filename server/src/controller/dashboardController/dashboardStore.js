const db = require("../../config/knexfile");

// Key used for items that are not linked to a plan.
const OTHER_KEY = "other";

// Narrows a query that has `subs_summ as s` to the bills the dashboard counts:
// this branch, not soft-deleted, bill date inside the range (both days
// included), and a payment status of completed or pending. Draft and cancelled
// bills are left out.
const countedBills = (query, branchId, { startDate, endDate }) =>
  query
    .where("s.branch_id", branchId)
    .whereNull("s.deleted_at")
    .where("s.bill_date", ">=", startDate)
    .where("s.bill_date", "<=", endDate)
    .whereExists(function hasPaidStatus() {
      this.select(db.raw("1"))
        .from("payments_status as ps")
        // subs_billno is text and bill_no is a number, so compare them as numbers.
        // No collation is involved, so this runs the same on every MySQL and
        // MariaDB version. subs_billno always holds a whole number (String(billNo)).
        .whereRaw("CAST(ps.subs_billno AS UNSIGNED) = s.bill_no")
        .whereRaw("ps.branch_id = s.branch_id")
        .whereIn("ps.payments_status", ["completed", "pending"]);
    });

// Subscriptions per day: one { date, value } record for every bill date in
// the range that has at least one bill.
//   date  = the bill date (YYYY-MM-DD)
//   value = number of bills (a bill can have several subs_summ rows, so rows
//           are counted by distinct bill_no)
// Oldest day first, so the list can be plotted as it is.
const findSubscriptionTrend = async (branchId, range) => {
  const rows = await countedBills(db("subs_summ as s"), branchId, range)
    .groupBy("s.bill_date")
    .select(
      db.raw("DATE_FORMAT(s.bill_date, '%Y-%m-%d') AS date"),
      db.raw("COUNT(DISTINCT s.bill_no) AS value"),
    )
    .orderBy("s.bill_date", "asc");

  return rows.map((row) => ({
    date: row.date,
    value: Number(row.value),
  }));
};

// Sales per day and plan: one { date, key, value } record for every bill date
// and plan in the range that has sales.
//   date  = the bill date (YYYY-MM-DD)
//   key   = the plan id as text, or "other" for items without a plan
//   value = total_price of the items, tax included, in paise
// Oldest day first, so the list can be grouped as it is.
const findSalesTrend = async (branchId, range) => {
  const rows = await countedBills(
    db("subs_items as i").join("subs_summ as s", "s.id", "i.subs_summ_id"),
    branchId,
    range,
  )
    .whereNull("i.deleted_at")
    .groupBy("s.bill_date", "i.plan_id")
    .select(
      db.raw("DATE_FORMAT(s.bill_date, '%Y-%m-%d') AS date"),
      "i.plan_id",
      db.raw("SUM(i.total_price) AS value"),
    )
    .orderBy("s.bill_date", "asc");

  return rows.map((row) => ({
    date: row.date,
    key: row.plan_id === null ? OTHER_KEY : String(row.plan_id),
    value: Number(row.value),
  }));
};

// The plans a sales chart is split into: [{ key, name }], shortest plan first.
// Lists every plan of the branch, so a plan keeps its place (and colour) in the
// chart whichever range is picked. A deleted plan is listed only when it has
// sales in `salesRows`, and "Other" only when some item has no plan.
const findSalesSeries = async (branchId, salesRows) => {
  const soldKeys = new Set(salesRows.map((row) => row.key));
  const soldPlanIds = [...soldKeys].filter((key) => key !== OTHER_KEY);

  const plans = await db("plans")
    .where("branch_id", branchId)
    .where(function activeOrSold() {
      this.whereNull("deleted_at").orWhereIn("id", soldPlanIds);
    })
    .select("id", "name")
    .orderBy([
      { column: "duration_days", order: "asc" },
      { column: "id", order: "asc" },
    ]);

  const series = plans.map((plan) => ({ key: String(plan.id), name: plan.name }));

  if (soldKeys.has(OTHER_KEY)) {
    series.push({ key: OTHER_KEY, name: "Other" });
  }

  return series;
};

module.exports = {
  findSubscriptionTrend,
  findSalesTrend,
  findSalesSeries,
};
