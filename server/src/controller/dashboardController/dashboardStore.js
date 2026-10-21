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

// Payment modes for the range: one { id, name, count, amount } record for
// every payment mode of the branch (a mode nobody used shows 0 and 0).
//   count  = number of bills paid with that mode
//   amount = money received with that mode in paise: paid_price minus the
//            change given back (never below 0)
// Counts the same bills as the rest of the dashboard: bill date inside the
// range (both days included), status completed or pending, a payment mode set.
// All payments_status rows of a bill are updated together, so only the newest
// row of each bill is read (same as the bill list), which keeps a bill with
// several items from being counted once per item.
// A mode used by the branch's bills is listed even when it belongs to another
// branch; a deleted mode only when it was used in the range. Oldest mode first,
// so every mode keeps its place whichever range is picked.
const findPaymentModes = async (branchId, { startDate, endDate }) => {
  const usedRows = await db("payments_status as ps")
    .join("payments as p", "p.id", "ps.payment_id")
    .where("ps.branch_id", branchId)
    .whereIn("ps.id", function newestRowOfEachBill() {
      this.select(db.raw("MAX(id)"))
        .from("payments_status")
        .where("branch_id", branchId)
        .groupBy("subs_billno");
    })
    .whereIn("ps.payments_status", ["completed", "pending"])
    .whereExists(function billInRange() {
      this.select(db.raw("1"))
        .from("subs_summ as s")
        .whereRaw("s.bill_no = CAST(ps.subs_billno AS UNSIGNED)")
        .whereRaw("s.branch_id = ps.branch_id")
        .whereNull("s.deleted_at")
        .where("s.bill_date", ">=", startDate)
        .where("s.bill_date", "<=", endDate);
    })
    .groupBy("p.id")
    .select(
      "p.id",
      db.raw("COUNT(*) AS bill_count"),
      // paid_price and change are unsigned, so they are cast before the
      // subtraction (an unsigned result below 0 would be an error).
      db.raw(
        "SUM(GREATEST(CAST(ps.paid_price AS SIGNED) - CAST(ps.?? AS SIGNED), 0)) AS amount",
        ["change"],
      ),
    );

  const usedById = new Map(usedRows.map((row) => [row.id, row]));

  // The branch's own modes, plus any mode its bills used (a bill can point at
  // a mode of another branch, e.g. a branch that has no modes of its own), plus
  // a deleted mode only when it was used in the range.
  const modes = await db("payments")
    .where(function ownOrUsed() {
      this.where(function ownActive() {
        this.where("branch_id", branchId).whereNull("deleted_at");
      }).orWhereIn("id", [...usedById.keys()]);
    })
    .select("id", "payment_name")
    .orderBy("id", "asc");

  return modes.map((mode) => {
    const used = usedById.get(mode.id);

    return {
      id: mode.id,
      name: mode.payment_name,
      count: Number(used?.bill_count ?? 0),
      amount: Number(used?.amount ?? 0),
    };
  });
};

// Genders a person can have (same values as the members.gender and
// users.gender columns), in display order. People without a gender are
// counted under "unspecified".
const GENDERS = [
  { key: "male", name: "Male" },
  { key: "female", name: "Female" },
  { key: "others", name: "Others" },
];
const UNSPECIFIED_KEY = "unspecified";

// "front_desk" -> "Front desk"
const groupTitle = (name) => {
  const text = String(name).replace(/_/g, " ");

  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Narrows an attendance query (mem_attendance or staff_attendance, as `a`) to
// this branch and to check-ins whose check-in time falls on a day inside the
// range (both days included).
const attendanceInRange = (query, branchId, { startDate, endDate }) =>
  query
    .where("a.branch_id", branchId)
    .where("a.checkinat", ">=", startDate)
    .whereRaw("a.checkinat < DATE_ADD(?, INTERVAL 1 DAY)", [endDate]);

// Male, Female and Others are always listed (0 when nobody checked in);
// "Not specified" only when some check-in has no gender.
const withUnspecified = (build) => {
  const result = GENDERS.map(build);
  const unspecified = build({ key: UNSPECIFIED_KEY, name: "Not specified" });

  if (unspecified.count > 0) result.push(unspecified);

  return result;
};

// Member attendance for the range, grouped by gender (for a pie chart).
// -> [{ key, name, count }]
//   count = number of check-ins (mem_attendance rows) of members of that gender
const findMemberAttendanceByGender = async (branchId, range) => {
  const rows = await attendanceInRange(
    db("mem_attendance as a").join("members as m", "m.id", "a.member_id"),
    branchId,
    range,
  )
    .groupBy("m.gender")
    .select("m.gender", db.raw("COUNT(*) AS total"));

  const countByKey = new Map(
    rows.map((row) => [row.gender ?? UNSPECIFIED_KEY, Number(row.total)]),
  );

  return withUnspecified(({ key, name }) => ({
    key,
    name,
    count: countByKey.get(key) ?? 0,
  }));
};

// Staff attendance for the range, grouped by gender and, inside each gender, by
// staff group (for a stacked pie: gender inside, group outside).
// -> [{ key, name, count, groups: [{ key, name, count }] }]
//   count (gender) = all check-ins (staff_attendance rows) of that gender
//   groups         = the same check-ins split by the staff member's group
//                    (owner, manager, front_desk, trainer ...) in group order.
//                    Every group is listed under every gender (0 when none).
// The staff member's gender and group are read from users and groups.
const findStaffAttendanceByGender = async (branchId, range) => {
  const rows = await attendanceInRange(
    db("staff_attendance as a")
      .join("users as u", "u.id", "a.user_id")
      .join("groups as g", "g.id", "u.group_id"),
    branchId,
    range,
  )
    .groupBy("u.gender", "g.id")
    .select("u.gender", "g.id as group_id", db.raw("COUNT(*) AS total"));

  // Every active group, plus a deleted one only when it has check-ins in the
  // range. Oldest group first, so a group keeps its place.
  const usedGroupIds = [...new Set(rows.map((row) => row.group_id))];

  const groups = await db("groups")
    .where(function activeOrUsed() {
      this.whereNull("deleted_at").orWhereIn("id", usedGroupIds);
    })
    .select("id", "name")
    .orderBy("id", "asc");

  // "<gender>|<group id>" -> number of check-ins.
  const counts = new Map(
    rows.map((row) => [
      `${row.gender ?? UNSPECIFIED_KEY}|${row.group_id}`,
      Number(row.total),
    ]),
  );

  return withUnspecified(({ key, name }) => {
    const items = groups.map((group) => ({
      key: String(group.id),
      name: groupTitle(group.name),
      count: counts.get(`${key}|${group.id}`) ?? 0,
    }));

    return {
      key,
      name,
      count: items.reduce((sum, item) => sum + item.count, 0),
      groups: items,
    };
  });
};
module.exports = {
  findSubscriptionTrend,
  findSalesTrend,
  findSalesSeries,
  findPaymentModes,
  findMemberAttendanceByGender,
  findStaffAttendanceByGender,
};
