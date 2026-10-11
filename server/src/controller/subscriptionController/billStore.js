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

    await trx("payments_status")
      .where(bill)
      .update({ total_price: grandTotal, updated_by: userId });

    await trx("payments_status").insert({
      ...bill,
      total_price: grandTotal,
      created_by: userId,
    });

    return items;
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

module.exports = { generateBillNo, getItems, addItem, toBill };
