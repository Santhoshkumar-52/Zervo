const db = require("../../config/knexfile");

// Subscriptions per day: one { date, value } record for every bill date in
// the range (both days included) that has at least one bill.
//   date  = the bill date (YYYY-MM-DD)
//   value = number of bills (a bill is one subs_summ row per item, so rows
//           are counted by distinct bill_no)
// Scoped to the branch; soft-deleted rows are hidden. Draft and cancelled
// bills are left out: only bills whose payment status is completed or pending
// count. Oldest day first, so the list can be plotted as it is.
const findSubscriptionTrend = async (branchId, { startDate, endDate }) => {
  const rows = await db("subs_summ as s")
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
    })
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

module.exports = {
  findSubscriptionTrend,
};
