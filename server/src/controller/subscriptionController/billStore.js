const db = require("../../config/knexfile");

// A new bill number is the current time in seconds (fits the unsigned INT
// column). Every item added to the same bill reuses that number.
const generateBillNo = () => Math.floor(Date.now() / 1000);

// Items of one bill, in the shape the client table reads.
const getItems = (branchId, billNo, conn = db) =>
  conn("subs_summ as s")
    .join("subs_items as i", "i.subs_summ_id", "s.id")
    .where({ "s.branch_id": branchId, "s.bill_no": billNo })
    .whereNull("s.deleted_at")
    .whereNull("i.deleted_at")
    .orderBy("i.id")
    .select(
      "i.id",
      "s.bill_no",
      db.raw("DATE_FORMAT(s.bill_date, '%Y-%m-%d') as bill_date"),
      "s.member_id",
      "i.plan_id",
      "i.item_name as plan_name",
      db.raw("DATE_FORMAT(i.start_date, '%Y-%m-%d') as start_date"),
      db.raw("DATE_FORMAT(i.end_date, '%Y-%m-%d') as end_date"),
      "i.base_price as price_minor",
      "i.discount_type",
      "i.discount_price as discount_minor",
      "i.tax_percent as tax_rate",
      "i.tax_amount as tax_minor",
      "i.total_price as total_minor",
    );

const sumTotals = (items) =>
  items.reduce((sum, item) => sum + Number(item.total_minor), 0);

// Saves one item as a subs_summ + subs_items row plus a draft payments_status
// row, all under the same bill number. The bill's total is then refreshed on
// every payments_status row of the bill. payment_id stays empty until paid.
// Returns the whole bill.
const addItem = (branchId, userId, billNo, item) =>
  db.transaction(async (trx) => {
    const pricing = {
      start_date: item.start_date,
      end_date: item.end_date,
      base_price: item.price_minor,
      discount_type: item.discount_type,
      discount_price: item.discount_minor,
      discount_rate: item.discount_rate,
      discounted_price: item.taxable_minor,
      tax_percent: item.tax_rate,
      tax_amount: item.tax_minor,
      total_price: item.total_minor,
      created_by: userId,
    };

    const [summId] = await trx("subs_summ").insert({
      bill_no: billNo,
      bill_date: item.bill_date,
      branch_id: branchId,
      member_id: item.member_id,
      ...pricing,
    });

    await trx("subs_items").insert({
      subs_summ_id: summId,
      plan_id: item.plan_id,
      item_name: item.plan_name,
      ...pricing,
    });

    const items = await getItems(branchId, billNo, trx);
    const grandTotal = sumTotals(items);
    const bill = { branch_id: branchId, subs_billno: String(billNo) };

    await trx("payments_status").where(bill).update({ updated_by: userId });

    await trx("payments_status").insert({
      ...bill,
      payments_status: "draft",
      created_by: userId,
    });

    return items;
  });

// What is saved for a bill in each of its three tables: the first subs_summ
// row, the first subs_items row, and the status of every payments_status row.
const findBillRecords = async (branchId, billNo) => {
  const [summ, item, statuses] = await Promise.all([
    db("subs_summ")
      .where({ branch_id: branchId, bill_no: billNo })
      .whereNull("deleted_at")
      .first("id"),
    db("subs_items as i")
      .join("subs_summ as s", "s.id", "i.subs_summ_id")
      .where({ "s.branch_id": branchId, "s.bill_no": billNo })
      .whereNull("s.deleted_at")
      .whereNull("i.deleted_at")
      .first("i.id"),
    db("payments_status")
      .where({ branch_id: branchId, subs_billno: String(billNo) })
      .pluck("payments_status"),
  ]);

  return { summ, item, statuses };
};

// Saves the payment on every payments_status row of the bill: the method, the
// amount paid, the change given back (minor units) and the resulting status
// ("completed" when fully paid, "pending" otherwise).
//
// When hasBalance is true (the amount paid is less than the grand total) one
// subs_balance row is inserted for the bill with what was paid; nothing is
// inserted for a full or larger payment. Both tables change in one
// transaction.
const completePayment = (
  branchId,
  billNo,
  { paymentId, paidPrice, changePrice, paymentsStatus, hasBalance },
  userId,
) =>
  db.transaction(async (trx) => {
    await trx("payments_status")
      .where({ branch_id: branchId, subs_billno: String(billNo) })
      .update({
        payment_id: paymentId,
        paid_price: paidPrice,
        change: changePrice,
        payments_status: paymentsStatus,
        updated_by: userId,
      });

    if (hasBalance) {
      await trx("subs_balance").insert({
        bill_no: billNo,
        branch_id: branchId,
        paid_amount: paidPrice,
        created_by: userId,
        updated_by: userId,
      });
    }
  });

// The shape the client table reads.
const toBill = (billNo, items) => ({
  bill_no: billNo,
  items,
  totals: {
    item_count: items.length,
    grand_total_minor: sumTotals(items),
  },
});

const sumOf = (rows, key) =>
  rows.reduce((total, row) => total + Number(row[key] || 0), 0);

// knex raw expressions have no `.as()`, so the alias is added in the SQL.
// Used as: formatDay("s.bill_date").as("bill_date")
// `??` quotes the column and the alias as identifiers.
const formatDay = (column) => ({
  as: (alias) => db.raw("DATE_FORMAT(??, '%Y-%m-%d') AS ??", [column, alias]),
});

// Everything the summary bill page shows for one bill number, scoped to the
// branch. A bill is one subs_summ row per item, so the header figures are the
// sum of those rows. Returns null when the bill does not exist.
const findSummaryBill = async (branchId, billNo) => {
  const [summRows, items, branch] = await Promise.all([
    db("subs_summ as s")
      .leftJoin("users as u", "u.id", "s.created_by")
      .where({ "s.branch_id": branchId, "s.bill_no": billNo })
      .whereNull("s.deleted_at")
      .orderBy("s.id")
      .select(
        "s.member_id",
        "s.subscription_no",
        formatDay("s.bill_date").as("bill_date"),
        formatDay("s.start_date").as("start_date"),
        formatDay("s.end_date").as("end_date"),
        "s.base_price",
        "s.discount_type",
        "s.discount_price",
        "s.discount_rate",
        "s.discounted_price",
        "s.tax_percent",
        "s.tax_amount",
        "s.total_price",
        "u.full_name as issued_by",
      ),
    db("subs_items as i")
      .join("subs_summ as s", "s.id", "i.subs_summ_id")
      .where({ "s.branch_id": branchId, "s.bill_no": billNo })
      .whereNull("s.deleted_at")
      .whereNull("i.deleted_at")
      .orderBy("i.id")
      .select(
        "i.id",
        "i.item_type",
        "i.item_name",
        "i.item_description",
        "i.quantity",
        formatDay("i.start_date").as("start_date"),
        formatDay("i.end_date").as("end_date"),
        "i.base_price",
        "i.discount_type",
        "i.discount_price",
        "i.discount_rate",
        "i.discounted_price",
        "i.tax_percent",
        "i.tax_amount",
        "i.total_price",
      ),
    db("branches")
      .where({ id: branchId })
      .first("name", "logo", "code", "address", "phone", "currency"),
  ]);

  if (!summRows.length) return null;

  const [first] = summRows;

  const [member, status, balanceRow] = await Promise.all([
    db("members as m")
      .leftJoin("users as t", "t.id", "m.assigned_trainer_id")
      .where({ "m.id": first.member_id, "m.branch_id": branchId })
      .first(
        "m.first_name",
        "m.last_name",
        "m.member_Id",
        "m.phone",
        "m.email",
        "m.avatar_url",
        formatDay("m.joined_on").as("joined_on"),
        "t.full_name as trainer_name",
      ),
    // All rows of a bill are updated together, so the newest one speaks for it.
    db("payments_status as ps")
      .leftJoin("payments as p", "p.id", "ps.payment_id")
      .where({ "ps.branch_id": branchId, "ps.subs_billno": String(billNo) })
      .orderBy("ps.id", "desc")
      .first(
        "ps.payments_status",
        "ps.paid_price",
        "ps.change",
        "ps.updated_at",
        "p.payment_name",
      ),
    // The bill's first subs_balance record (undefined when it has none).
    db("subs_balance")
      .where({ branch_id: branchId, bill_no: billNo })
      .whereNull("deleted_at")
      .orderBy("id")
      .first("paid_amount"),
  ]);

  const discountTypes = [
    ...new Set(
      summRows
        .filter((row) => Number(row.discount_price) > 0)
        .map((row) => Number(row.discount_type)),
    ),
  ];
  const discountRates = [
    ...new Set(summRows.map((row) => Number(row.discount_rate || 0))),
  ];
  const taxRates = [...new Set(summRows.map((row) => Number(row.tax_percent)))];

  const discounted = sumOf(summRows, "discounted_price");
  const taxAmount = sumOf(summRows, "tax_amount");

  const summary = {
    bill_no: billNo,
    bill_date: first.bill_date,
    subscription_no: first.subscription_no,
    // The bill covers the earliest start to the latest end of its items.
    start_date: summRows.map((row) => row.start_date).sort()[0],
    end_date: summRows
      .map((row) => row.end_date)
      .sort()
      .reverse()[0],
    base_price: sumOf(summRows, "base_price"),
    // One kind of discount keeps its type (and rate); mixed ones show as a fixed amount.
    discount_type:
      discountTypes.length === 1
        ? discountTypes[0]
        : discountTypes.length
          ? 2
          : 0,
    discount_price: sumOf(summRows, "discount_price"),
    discount_rate:
      discountTypes.length === 1 &&
      discountTypes[0] === 1 &&
      discountRates.length === 1
        ? discountRates[0]
        : null,
    discounted_price: discounted,
    // One tax rate on every item is shown as is; otherwise the effective rate.
    tax_percent:
      taxRates.length === 1
        ? taxRates[0]
        : discounted
          ? Math.round((taxAmount / discounted) * 10000) / 100
          : 0,
    tax_amount: taxAmount,
    total_price: sumOf(summRows, "total_price"),
  };

  const completed = status?.payments_status === "completed";

  // Balance (minor units): only when the bill has a subs_balance record and its
  // paid_amount is less than the bill's total_price. Otherwise (no record, or
  // fully paid) it is 0.
  const balance =
    balanceRow && Number(balanceRow.paid_amount) < summary.total_price
      ? summary.total_price - Number(balanceRow.paid_amount)
      : 0;

  return {
    branch,
    summary,
    member: member ?? null,
    items,
    payment: {
      status: status?.payments_status ?? "draft",
      method: status?.payment_name ?? null,
      paid_on: completed ? status.updated_at : null,
      paid_price: Number(status?.paid_price ?? 0),
      change: Number(status?.change ?? 0),
      balance,
    },
    issued_by: first.issued_by ?? null,
  };
};

const METHOD_KEYS = ["cash", "card", "upi"];

// Payment figures for a list of bills ({ bill_no, total_minor }), keyed by
// String(bill_no). All amounts are minor units.
//   status       payments_status of the bill (draft when none)
//   paid_price / change   as saved on payments_status
//   amounts      what was actually received, per method: paid_price minus the
//                change given back, under cash / card / upi (any other method
//                goes under other); overall is their sum. Only completed or
//                pending bills with a payment method count; draft and
//                cancelled bills are 0.
//   balance      the bill's first subs_balance record: total_minor minus its
//                paid_amount while that is still less than the total, else 0
//   balance_status  "due" when a balance is owed, otherwise "clear"
// All payments_status rows of a bill are updated together, so the newest row
// speaks for the bill (read in id order, the last one wins).
const getPaymentDetails = async (branchId, bills) => {
  const details = new Map();

  if (!bills.length) return details;

  const billNos = bills.map((bill) => bill.bill_no);

  const [statusRows, balanceRows] = await Promise.all([
    db("payments_status as ps")
      .leftJoin("payments as p", "p.id", "ps.payment_id")
      .where("ps.branch_id", branchId)
      .whereIn("ps.subs_billno", billNos.map(String))
      .orderBy("ps.id")
      .select(
        "ps.subs_billno",
        "ps.payments_status",
        "ps.paid_price",
        "ps.change",
        "ps.updated_at",
        "p.payment_name",
      ),
    db("subs_balance")
      .where("branch_id", branchId)
      .whereIn("bill_no", billNos)
      .whereNull("deleted_at")
      .orderBy("id")
      .select("bill_no", "paid_amount"),
  ]);

  const statusByBill = new Map(
    statusRows.map((row) => [String(row.subs_billno), row]),
  );

  // First record of each bill only.
  const balanceByBill = new Map();

  balanceRows.forEach((row) => {
    const key = String(row.bill_no);

    if (!balanceByBill.has(key)) balanceByBill.set(key, row);
  });

  bills.forEach((bill) => {
    const key = String(bill.bill_no);
    const totalMinor = Number(bill.total_minor);
    const status = statusByBill.get(key);
    const balanceRow = balanceByBill.get(key);

    const paidPrice = Number(status?.paid_price ?? 0);
    const change = Number(status?.change ?? 0);

    // Money only counts as received once a payment method is set on a
    // completed or pending bill. Draft and cancelled bills (and any paid_price
    // left on them) add nothing.
    const isReceived =
      Boolean(status?.payment_name) &&
      ["completed", "pending"].includes(status.payments_status);
    const received = isReceived ? Math.max(paidPrice - change, 0) : 0;

    const methodName = status?.payment_name?.trim().toLowerCase();
    const methodKey = METHOD_KEYS.includes(methodName) ? methodName : "other";
    const amounts = { cash: 0, card: 0, upi: 0, other: 0, overall: received };

    amounts[methodKey] = received;

    const balance =
      balanceRow && Number(balanceRow.paid_amount) < totalMinor
        ? totalMinor - Number(balanceRow.paid_amount)
        : 0;

    details.set(key, {
      total_minor: totalMinor,
      payment: {
        status: status?.payments_status ?? "draft",
        method: status?.payment_name ?? null,
        paid_on:
          status?.payments_status === "completed" ? status.updated_at : null,
        paid_price: paidPrice,
        change,
        amounts,
        balance,
        balance_status: balance > 0 ? "due" : "clear",
      },
    });
  });

  return details;
};
// One page of the bills whose bill date falls between startDate and endDate
// (both included), newest first. A bill is one subs_summ row per item, so the
// rows are grouped by bill_no. Search matches the bill no, the member's
// member_Id and the member's phone. Scoped to the branch.
// Returns { bills, totals, total }: total counts every matching bill, and
// totals adds up the money of every matching bill (all pages), see
// getPaymentDetails for how each bill's payment is worked out.
const findSubscriptionList = async (
  branchId,
  { startDate, endDate, search, page, limit },
) => {
  const base = db("subs_summ as s")
    .leftJoin("members as m", function joinMember() {
      this.on("m.id", "=", "s.member_id").andOn(
        "m.branch_id",
        "=",
        "s.branch_id",
      );
    })
    .where("s.branch_id", branchId)
    .whereNull("s.deleted_at")
    .where("s.bill_date", ">=", startDate)
    .whereRaw("s.bill_date < DATE_ADD(?, INTERVAL 1 DAY)", [endDate]);

  if (search) {
    const like = `%${search}%`;

    base.where((query) => {
      query
        .whereRaw("CAST(s.bill_no AS CHAR) LIKE ?", [like])
        .orWhere("m.member_Id", "like", like)
        .orWhere("m.phone", "like", like);
    });
  }

  const [{ total }] = await base.clone().countDistinct("s.bill_no as total");

  const rows = await base
    .clone()
    .groupBy(
      "s.bill_no",
      "s.bill_date",
      "s.member_id",
      "m.first_name",
      "m.last_name",
      "m.member_Id",
      "m.phone",
      "m.avatar_url",
    )
    .select(
      "s.bill_no",
      formatDay("s.bill_date").as("bill_date"),
      "s.member_id",
      "m.first_name",
      "m.last_name",
      "m.member_Id as member_code",
      "m.phone",
      "m.avatar_url",
      db.raw("COUNT(*) as item_count"),
      db.raw("SUM(s.total_price) as total_minor"),
    )
    .orderBy("s.bill_date", "desc")
    .orderBy("s.bill_no", "desc")
    .limit(limit)
    .offset((page - 1) * limit);

  // Payment figures are worked out for every bill in the range (not only this
  // page) so the totals cover the whole result.
  const allBills = await base
    .clone()
    .groupBy("s.bill_no")
    .select("s.bill_no", db.raw("SUM(s.total_price) as total_minor"));

  const details = await getPaymentDetails(branchId, allBills);

  const totals = {
    total_amount: 0,
    total_cash: 0,
    total_card: 0,
    total_upi: 0,
    total_other: 0,
    total_paid: 0,
    total_balance: 0,
  };

  for (const { total_minor: billTotal, payment } of details.values()) {
    totals.total_amount += billTotal;
    totals.total_cash += payment.amounts.cash;
    totals.total_card += payment.amounts.card;
    totals.total_upi += payment.amounts.upi;
    totals.total_other += payment.amounts.other;
    totals.total_paid += payment.amounts.overall;
    totals.total_balance += payment.balance;
  }

  const bills = rows.map((row) => ({
    bill_no: row.bill_no,
    bill_date: row.bill_date,
    member: {
      id: row.member_id,
      member_id: row.member_code ?? null,
      name: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
      phone: row.phone ?? null,
      avatar_url: row.avatar_url ?? null,
    },
    item_count: Number(row.item_count),
    total_minor: Number(row.total_minor),
    payment: details.get(String(row.bill_no)).payment,
  }));

  return { bills, totals, total: Number(total) };
};

// Bills of the branch that still owe money, oldest bill first.
// A bill is due when ALL of these hold:
//   - its subs_balance record (not soft-deleted) has a paid_amount below the
//     bill total (the sum of its items),
//   - the balance was not written off (subs_balance.written_off is false),
//   - the bill's newest payments_status row is not "cancelled". (A part paid
//     bill is saved as "completed" with a subs_balance record, so the status
//     cannot be used to find due bills; it is only used to drop cancelled ones.)
// Paging, filtering and the totals all run in SQL, so total / totals cover
// every matching bill (all pages), not just the page returned.
const findDueBillList = async (branchId, { search, page, limit }) => {
  const base = db("subs_summ as s")
    .join("subs_balance as b", function joinBalance() {
      this.on("b.bill_no", "=", "s.bill_no").andOn(
        "b.branch_id",
        "=",
        "s.branch_id",
      );
    })
    .leftJoin("members as m", function joinMember() {
      this.on("m.id", "=", "s.member_id").andOn(
        "m.branch_id",
        "=",
        "s.branch_id",
      );
    })
    .where("s.branch_id", branchId)
    .whereNull("s.deleted_at")
    .whereNull("b.deleted_at")
    .where("b.written_off", false)
    .whereNotExists(function newestStatusIsCancelled() {
      this.select(db.raw("1"))
        .from("payments_status as ps")
        .whereRaw("ps.branch_id = s.branch_id")
        .whereRaw("CAST(ps.subs_billno AS UNSIGNED) = s.bill_no")
        .where("ps.payments_status", "cancelled")
        .whereRaw(
          "ps.id = (SELECT MAX(l.id) FROM payments_status l WHERE l.branch_id = ps.branch_id AND l.subs_billno = ps.subs_billno)",
        );
    });

  if (search) {
    const like = `%${search}%`;

    base.where((query) => {
      query
        .whereRaw("CAST(s.bill_no AS CHAR) LIKE ?", [like])
        .orWhere("m.member_Id", "like", like)
        .orWhere("m.phone", "like", like);
    });
  }

  // One row per bill that still owes money.
  const due = base
    .clone()
    .groupBy(
      "s.bill_no",
      "s.bill_date",
      "s.member_id",
      "m.first_name",
      "m.last_name",
      "m.member_Id",
      "m.phone",
      "m.avatar_url",
      "b.paid_amount",
    )
    .havingRaw("SUM(s.total_price) > b.paid_amount")
    .select(
      "s.bill_no",
      formatDay("s.bill_date").as("bill_date"),
      "s.member_id",
      "m.first_name",
      "m.last_name",
      "m.member_Id as member_code",
      "m.phone",
      "m.avatar_url",
      "b.paid_amount as paid_minor",
      db.raw("COUNT(*) as item_count"),
      db.raw("SUM(s.total_price) as total_minor"),
    );

  const totalsRow = await db
    .from(due.clone().as("due"))
    .select(
      db.raw("COUNT(*) as bill_count"),
      db.raw("COALESCE(SUM(total_minor), 0) as total_amount"),
      db.raw("COALESCE(SUM(paid_minor), 0) as total_paid"),
    )
    .first();

  const rows = await due
    .clone()
    .orderBy("s.bill_date", "asc")
    .orderBy("s.bill_no", "asc")
    .limit(limit)
    .offset((page - 1) * limit);

  const details = await getPaymentDetails(
    branchId,
    rows.map((row) => ({
      bill_no: row.bill_no,
      total_minor: Number(row.total_minor),
    })),
  );

  const totalAmount = Number(totalsRow.total_amount);
  const totalPaid = Number(totalsRow.total_paid);

  const bills = rows.map((row) => {
    const totalMinor = Number(row.total_minor);
    const paidMinor = Number(row.paid_minor);

    return {
      bill_no: row.bill_no,
      bill_date: row.bill_date,
      member: {
        id: row.member_id,
        member_id: row.member_code ?? null,
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
        phone: row.phone ?? null,
        avatar_url: row.avatar_url ?? null,
      },
      item_count: Number(row.item_count),
      total_minor: totalMinor,
      paid_minor: paidMinor,
      balance_minor: totalMinor - paidMinor,
      payment: details.get(String(row.bill_no)).payment,
    };
  });

  return {
    bills,
    totals: {
      bill_count: Number(totalsRow.bill_count),
      total_amount: totalAmount,
      total_paid: totalPaid,
      total_balance: totalAmount - totalPaid,
    },
    total: Number(totalsRow.bill_count),
  };
};

module.exports = {
  generateBillNo,
  getItems,
  addItem,
  findBillRecords,
  completePayment,
  toBill,
  findSummaryBill,
  findSubscriptionList,
  findDueBillList,
};
