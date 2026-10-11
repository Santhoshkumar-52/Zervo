// SAMPLE copy for a gym / fitness membership bill.
// Written to read like real terms, but it is placeholder text: have it
// reviewed against your own policies and local law before going live.
// Branches can pass their own list to <SummaryBill terms={...} />.

export const DEFAULT_TERMS = [
  {
    id: "membership",
    title: "Your membership",
    body: "This membership is personal to the member named on the bill and can't be transferred or shared. The branch may ask for photo ID at entry. Members under 18 need a parent or guardian's written consent.",
  },
  {
    id: "validity",
    title: "Validity",
    body: "Your membership runs from the start date to the end date shown on this bill, and both days are included. Unused days don't carry over after the end date unless a freeze was approved.",
  },
  {
    id: "freeze",
    title: "Freezing your plan",
    body: "Plans that allow freezing can be paused for up to the freeze days listed in the plan. Ask at the front desk before the pause begins. Frozen days are added to your end date, and a freeze can't be applied after the fact.",
  },
  {
    id: "fees",
    title: "Fees, discounts and tax",
    body: "Amounts are shown in the branch currency, with tax added as listed. A discount applies only to the items it appears against, can't be combined with other offers, and can't be applied to a bill that has already been issued.",
  },
  {
    id: "refunds",
    title: "Refunds and cancellations",
    body: "Fees are non-refundable once the membership has started. A bill cancelled before payment is complete carries no charge. Refunds for documented medical reasons or relocation are considered by the branch manager case by case.",
  },
  {
    id: "renewals",
    title: "Renewals",
    body: "Renew before your end date to keep continuous access. A renewal made after the plan has ended starts on the day you renew, and current prices and offers apply.",
  },
  {
    id: "addons",
    title: "Personal training and add-ons",
    body: "Add-on sessions are valid only for the period shown against the item. Please give at least 12 hours' notice to reschedule a session; a session missed without notice counts as used.",
  },
  {
    id: "health",
    title: "Health and safety",
    body: "You confirm you're fit to exercise and have told the branch about any condition that may affect your training. Use equipment as instructed, report any injury to staff right away, and speak to a doctor before starting if you're unsure.",
  },
  {
    id: "conduct",
    title: "Conduct and facilities",
    body: "Wear suitable training clothes and footwear, wipe down equipment after use, and respect other members and staff. Recording other people on the floor isn't allowed. The branch may suspend a membership for serious misconduct without a refund.",
  },
  {
    id: "belongings",
    title: "Personal belongings",
    body: "Use the lockers provided and keep valuables with you or at home. The branch isn't responsible for loss of or damage to personal items.",
  },
  {
    id: "privacy",
    title: "Your information",
    body: "The branch keeps your name, contact details and billing history to run your membership and issue bills. We don't share them except where the law requires. Ask the front desk to correct anything that is wrong.",
  },
  {
    id: "changes",
    title: "Changes and disputes",
    body: "The branch may update these terms with notice at the front desk; the terms in force when you paid apply for your current period. If something looks wrong on this bill, contact the branch first so it can be put right.",
  },
];
