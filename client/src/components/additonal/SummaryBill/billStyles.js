// Look of the bill, kept apart from the app theme on purpose.
// The bill is a paper document: white sheet, black ink, grey rules. It never
// follows light/dark mode or the theme colours, so it reads the same on every
// phone and prints the same on every printer.
//
// Palette: zinc for paper and ink; green / amber / red only for payment
// status and the balance still owed.

// Small uppercase caption above a block of details.
export const LABEL =
  "text-xs font-semibold tracking-wider text-zinc-600 uppercase";

// Padding shared by every block so the edges line up.
export const PAD = "px-5 py-5 sm:px-7";
