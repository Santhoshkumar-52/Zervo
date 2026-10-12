const {
  DISCOUNT_TYPE,
  calculateTotals,
  getEndDate,
} = require("../../utils/billing");

/**
 * Seed subscription bills (sample data for the Subscriptions report).
 *
 * Flow: branches -> users -> members -> plans/discounts/taxes -> payments
 *       -> subscriptions (this file)
 *
 * Every bill is written the same way the app writes it:
 *   - one subs_summ + one subs_items row per item
 *   - one payments_status row per item, all carrying the bill's grand total
 *   - amounts come from utils/billing (calculateTotals / getEndDate)
 *
 * Bill dates run from DAYS_BACK days ago up to today, so the report always has
 * data inside its date range. Everything is deterministic (no random), so
 * every run produces the same shape of data.
 *
 * Seeded rows are marked with a subscription_no that starts with "SEED-".
 * Running this seed again removes only those rows (never bills created in the
 * app) and creates them again, so it can be re-run on its own:
 *
 *   npx knex seed:run --specific=09_subscriptions.js
 *
 * @param {import('knex').Knex} knex
 */

const DAYS_BACK = 40;
const SEED_PREFIX = "SEED-";

// How many bills a branch gets on a day, `day` being the days before today
// (0 = today ... 40 = DAYS_BACK days ago).
const BILLS_ON_DAY = {
  // A bill every day plus a second one every 5th day: 41 + 9 = 50 bills.
  MAIN: (day) => (day % 5 === 0 ? 2 : 1),

  // No bill on every 4th day (3, 7, 11 ...), a second one on days 0, 14, 21
  // and 28: 31 + 4 = 35 bills.
  "ANNA-NAGAR": (day) => (day % 4 === 3 ? 0 : [0, 14, 21, 28].includes(day) ? 2 : 1),
};

// Status of each bill, repeated in this order: mostly paid, some still open.
const STATUS_CYCLE = [
  "completed", "completed", "completed", "pending", "completed",
  "draft", "completed", "cancelled", "completed", "completed",
  "pending", "completed", "cancelled", "completed", "draft",
  "completed", "completed", "pending", "completed", "cancelled",
];

// Payment method of the paid bills, by name, repeated in this order.
const METHOD_CYCLE = ["UPI", "Cash", "Card", "UPI", "Cash"];

// Plans (by position in the branch's plan list) used by the items in turn.
const PLAN_CYCLE = [0, 1, 0, 2, 1, 0, 3, 1, 0, 2];

// Every 5th bill has two items and every 11th has three.
const itemsInBill = (index) => {
  if (index % 11 === 0) return 3;
  if (index % 5 === 0) return 2;
  return 1;
};

// "2026-10-12" from the local calendar day (never shifted by the timezone).
const toDay = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const addDays = (day, count) => {
  const [year, month, date] = day.split("-").map(Number);

  return toDay(new Date(year, month - 1, date + count));
};

// Removes the rows of an earlier run of this seed, children first.
const removeSeededBills = async (trx) => {
  const seeded = await trx("subs_summ")
    .where("subscription_no", "like", `${SEED_PREFIX}%`)
    .select("id", "bill_no");

  if (!seeded.length) return;

  const summIds = seeded.map((row) => row.id);
  const billNos = [...new Set(seeded.map((row) => String(row.bill_no)))];

  await trx("subs_items").whereIn("subs_summ_id", summIds).del();
  await trx("payments_status").whereIn("subs_billno", billNos).del();
  await trx("subs_summ").whereIn("id", summIds).del();
};

exports.seed = async function (knex) {
  await knex.transaction(async (trx) => {
    const branches = await trx("branches").select("id", "code");
    const payments = await trx("payments")
      .where({ is_active: true })
      .whereNull("deleted_at")
      .orderBy("id")
      .select("id", "branch_id", "payment_name");

    if (!payments.length) {
      throw new Error("No payment methods found. Run 08_payment_methods first.");
    }

    await removeSeededBills(trx);

    const now = new Date();
    const usedBillNos = new Set();

    for (const [code, billsOnDay] of Object.entries(BILLS_ON_DAY)) {
      const branch = branches.find((item) => item.code === code);

      if (!branch) throw new Error(`Branch not found: ${code}`);

      // ---- Lookups for this branch ------------------------------------

      const members = await trx("members")
        .where({ branch_id: branch.id })
        .whereNull("deleted_at")
        .orderBy("id")
        .pluck("id");

      const plans = await trx("plans")
        .where({ branch_id: branch.id, is_active: true })
        .whereNull("deleted_at")
        .orderBy("id")
        .select("id", "name", "duration_days", "price_minor");

      const tax = await trx("taxes")
        .where({ branch_id: branch.id, is_active: true })
        .whereNull("deleted_at")
        .orderBy("id")
        .first("rate");

      const discountRows = await trx("discounts")
        .where({ branch_id: branch.id, is_active: true })
        .whereNull("deleted_at")
        .orderBy("id")
        .select("type", "value");

      // Staff who can issue bills (owner, manager, front desk) of this branch.
      const issuers = await trx("users")
        .join("groups", "groups.id", "users.group_id")
        .where("users.branch_id", branch.id)
        .where("users.is_active", true)
        .whereNull("users.deleted_at")
        .whereIn("groups.name", ["owner", "manager", "front_desk"])
        .orderBy("users.id")
        .pluck("users.id");

      if (!members.length) {
        throw new Error(`No members found for ${code}. Run 04_members first.`);
      }

      if (!plans.length) {
        throw new Error(`No active plans found for ${code}. Run 05_plans first.`);
      }

      // "No discount" first, then the branch's own discounts.
      const discountOptions = [
        { type: DISCOUNT_TYPE.NONE, value: 0 },
        ...discountRows.map((row) => ({
          type: Number(row.type),
          value: Number(row.value),
        })),
      ];

      // Payment methods, preferring the branch's own rows.
      const methodFor = (name) =>
        payments.find((p) => p.payment_name === name && p.branch_id === branch.id) ??
        payments.find((p) => p.payment_name === name) ??
        payments[0];

      // ---- Bills ------------------------------------------------------

      let index = 0; // bill counter of this branch
      let itemSeq = 0; // item counter of this branch (subscription_no)

      // Oldest day first, so older bills get the lower bill numbers.
      for (let day = DAYS_BACK; day >= 0; day -= 1) {
        const billCount = billsOnDay(day);

        for (let n = 0; n < billCount; n += 1) {
          index += 1;

          // ---- Date and bill number -----------------------------------

          const when = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - day,
            9 + ((index * 7) % 11),
            (index * 13) % 60,
          );

          // Today's bills are never dated in the future.
          if (when > now) when.setTime(now.getTime() - index * 60 * 1000);

          // Same format as the app: the time in seconds. Must be unique.
          let billNo = Math.floor(when.getTime() / 1000);

          while (usedBillNos.has(billNo)) billNo += 1;

          usedBillNos.add(billNo);

          const billDate = toDay(when);

          // ---- Who, how it was paid -----------------------------------

          const memberId = members[(index * 3 + day) % members.length];
          const issuerId = issuers.length ? issuers[index % issuers.length] : null;

          const status = STATUS_CYCLE[index % STATUS_CYCLE.length];
          const isPaid = status === "completed";

          // Paid bills are stamped a little after they were raised.
          const paidAt = new Date(when.getTime() + (10 + (index % 30)) * 60 * 1000);

          if (paidAt > now) paidAt.setTime(now.getTime());

          const paymentId = isPaid
            ? methodFor(METHOD_CYCLE[index % METHOD_CYCLE.length]).id
            : null;

          // ---- Items --------------------------------------------------

          const itemCount = itemsInBill(index);
          const items = [];

          for (let k = 0; k < itemCount; k += 1) {
            const plan = plans[PLAN_CYCLE[(index + k) % PLAN_CYCLE.length] % plans.length];
            const discount = discountOptions[(index + k) % discountOptions.length];

            // Most items start the day they are billed, some a few days later.
            const startDate = addDays(billDate, (index + k) % 4 === 3 ? 2 : 0);

            // One item in six is billed without tax.
            const taxRate = (index + k) % 6 === 5 ? 0 : Number(tax?.rate ?? 0);

            const amounts = calculateTotals({
              priceMinor: plan.price_minor,
              discountType: discount.type,
              discountValue: discount.value,
              taxRate,
            });

            items.push({
              plan,
              pricing: {
                start_date: startDate,
                end_date: getEndDate(startDate, plan.duration_days),
                base_price: amounts.priceMinor,
                discount_type: discount.type,
                discount_price: amounts.discountMinor,
                discount_rate:
                  discount.type === DISCOUNT_TYPE.PERCENTAGE ? discount.value : null,
                discounted_price: amounts.taxableMinor,
                tax_percent: taxRate,
                tax_amount: amounts.taxMinor,
                total_price: amounts.totalMinor,
              },
            });
          }

          const grandTotal = items.reduce(
            (sum, item) => sum + item.pricing.total_price,
            0,
          );

          // ---- Write (same three tables the app writes) ----------------

          for (const item of items) {
            itemSeq += 1;

            const audit = {
              created_by: issuerId,
              updated_by: issuerId,
              created_at: when,
              updated_at: isPaid ? paidAt : when,
            };

            const [summId] = await trx("subs_summ").insert({
              bill_no: billNo,
              bill_date: billDate,
              branch_id: branch.id,
              member_id: memberId,
              subscription_no: `${SEED_PREFIX}${code}-${String(itemSeq).padStart(4, "0")}`,
              ...item.pricing,
              ...audit,
            });

            await trx("subs_items").insert({
              subs_summ_id: summId,
              item_type: "membership",
              plan_id: item.plan.id,
              item_name: item.plan.name,
              quantity: 1,
              ...item.pricing,
              ...audit,
            });

            // Like the app: one status row per item, all with the grand total.
            await trx("payments_status").insert({
              subs_billno: String(billNo),
              branch_id: branch.id,
              payment_id: paymentId,
              total_price: grandTotal,
              payments_status: status,
              ...audit,
            });
          }
        }
      }

      console.log(`Seeded ${index} subscription bills for ${code}`);
    }
  });
};
