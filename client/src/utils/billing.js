// Ids match the server: discounts use 1 = percentage, 2 = fixed. 0 = no discount.
export const DISCOUNT_TYPE = {
  NONE: 0,
  PERCENTAGE: 1,
  FIXED: 2,
};

const toMinor = (amount) => Math.round(Number(amount) * 100);

/**
 * Price breakdown for one bill item. Everything is in minor units (paise)
 * so there is no floating point drift.
 *
 *   discount = percentage of the plan price, or a fixed amount (capped at the price)
 *   taxable  = price - discount
 *   tax      = taxable x rate / 100
 *   total    = taxable + tax
 *
 * The server does the same sum when an item is added; this is the live preview.
 */
export const calculateTotals = ({
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
