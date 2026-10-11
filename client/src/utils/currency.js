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
