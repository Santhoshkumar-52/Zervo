// The currency symbol comes from the env, e.g. VITE_CURRENCY=₹ in `.env`.
// Vite only exposes variables that start with VITE_, and it reads them when
// the dev server starts, so restart `npm run dev` after changing it.
export const currency = import.meta.env.VITE_CURRENCY ?? "";

// Money is held in minor units (paise): 159300 -> "₹1,593.00".
export const formatMoney = (minor) =>
  `${currency}${(Number(minor) / 100 || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Short form for chart axes: 150000 -> "1.5K", 12000000 -> "1.2L" (lakh) and
// 1200000000 -> "1.2Cr" (crore), with the currency symbol in front.
export const formatMoneyCompact = (minor) =>
  `${currency}${new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(minor) / 100 || 0)}`;
