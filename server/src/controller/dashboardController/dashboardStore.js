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
        // CAST gives the connection collation; match the column's own collation so
        // MySQL does not reject the "=" (ER_CANT_AGGREGATE_2COLLATIONS).
        .whereRaw(
          "ps.subs_billno = CAST(s.bill_no AS CHAR) COLLATE utf8mb4_0900_ai_ci",
        )
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
