// Money is always in minor units (paise), so there is no floating point drift.
// Ids match the discounts table: 1 = percentage, 2 = fixed. 0 = no discount.
const DISCOUNT_TYPE = {
  NONE: 0,
  PERCENTAGE: 1,
  FIXED: 2,
};

const toMinor = (amount) => Math.round(Number(amount) * 100);

// Price breakdown for one bill item. The client shows the same sum as a live
// preview, but this is the one that counts.
//
//   discount = percentage of the plan price, or a fixed amount (capped at the price)
//   taxable  = price - discount
//   tax      = taxable x rate / 100
//   total    = taxable + tax
const calculateTotals = ({
  priceMinor = 0,
  discountType = DISCOUNT_TYPE.NONE,
  discountValue = 0,
  taxRate = 0,
} = {}) => {
  const price = Math.max(Number(priceMinor) || 0, 0);
  const value = Math.max(Number(discountValue) || 0, 0);

  let discountMinor = 0;

  if (discountType === DISCOUNT_TYPE.PERCENTAGE) {
    discountMinor = Math.round((price * Math.min(value, 100)) / 100);
  } else if (discountType === DISCOUNT_TYPE.FIXED) {
    discountMinor = Math.min(toMinor(value), price);
  }

  const taxableMinor = price - discountMinor;
  const taxMinor = Math.round((taxableMinor * (Number(taxRate) || 0)) / 100);

  return {
    priceMinor: price,
    discountMinor,
    taxableMinor,
    taxMinor,
    totalMinor: taxableMinor + taxMinor,
  };
};

// "2026-11-01" -> Date (UTC midnight), or null when it is not a real date
// (e.g. "2026-02-30"). UTC is used so the server's timezone never shifts a day.
const parseDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isRealDate ? date : null;
};

// Last day of a plan. The start date counts as day 1, so a 30-day plan that
// starts on 1 Nov ends on 30 Nov.
const getEndDate = (startDate, durationDays) => {
  const start = parseDateOnly(startDate);

  if (!start) return null;

  start.setUTCDate(start.getUTCDate() + Number(durationDays) - 1);

  return start.toISOString().slice(0, 10);
};

module.exports = {
  DISCOUNT_TYPE,
  calculateTotals,
  parseDateOnly,
  getEndDate,
};