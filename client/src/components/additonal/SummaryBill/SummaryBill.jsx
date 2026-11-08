import { useMemo, useState } from "react";

import BillActions from "./BillActions";
import BillFooter from "./BillFooter";
import BillHeader from "./BillHeader";
import BillItems from "./BillItems";
import MemberDetails from "./MemberDetails";
import MembershipPeriod from "./MembershipPeriod";
import PaymentInfo from "./PaymentInfo";
import PriceSummary from "./PriceSummary";
import SubscriptionDetails from "./SubscriptionDetails";
import TermsAndConditions from "./TermsAndConditions";
import { createMoneyFormatter } from "./billHelpers";

// Printed bills are landscape, matching the wide on-screen layout.
const PRINT_PAGE = "@page { size: A4 landscape; margin: 8mm; }";

// Colour of the page behind the bill; the tear-off notches on the phone layout
// are cut out in this colour (see pages/summary-bill).
const NOTCH = "absolute size-7 rounded-full border border-zinc-300 bg-zinc-200 print:hidden";

/**
 * Summary bill for one subscription. Built for members first (they open it on
 * a phone from the branch's subbill_url) and for staff users second.
 *
 * Layout
 *   - Large screens: a landscape bill. Branch band on top; items on the left;
 *     a tear-off stub on the right with the total, balance and payment.
 *   - Phones: the same bill as a portrait receipt. Everything stacks in
 *     reading order and the totals sit on a stub at the bottom.
 * The bill has its own fixed colours (white paper, black ink, red for balance
 * due, green / amber for status) and does not use the app theme.
 *
 * bill = {
 *   branch:  { name, logo, code, address, phone, currency },          // branches
 *   summary: { bill_no, bill_date, subscription_no, start_date, end_date,
 *              base_price, discount_type, discount_price, discount_rate,
 *              discounted_price, tax_percent, tax_amount, total_price }, // subs_summ
 *   member:  { first_name, last_name, member_Id, phone, email, joined_on,
 *              avatar_url, trainer: { full_name } },                    // members
 *   items:   [{ id, item_type, item_name, item_description, quantity,
 *               start_date, end_date, base_price, discount_type,
 *               discount_price, discount_rate, discounted_price,
 *               tax_percent, tax_amount, total_price }],                // subs_items
 *   payment: { status, method, paid_on,     // payments_status + payments
 *              paid_price, change, balance }, // balance: still owed (red)
 *   issued_by,                              // users.full_name of subs_summ.created_by
 * }
 * Money is in paise (minor units), like the database.
 *
 * Props: `terms` replaces the sample terms, `showActions={false}` hides the
 * print button, `today` pins the date used for the period bar (tests, previews).
 */
function SummaryBill({
  bill,
  terms,
  today,
  showActions = true,
  onPrint,
  className = "",
}) {
  const [fallbackToday] = useState(() => new Date());
  const currency = bill?.branch?.currency;
  const money = useMemo(() => createMoneyFormatter(currency), [currency]);

  if (!bill) return null;

  const { branch = {}, summary = {}, member, items = [], payment = {}, issued_by } = bill;
  const status = payment.status ?? "draft";

  // The stamp in the header: a draft or cancelled bill keeps that status;
  // otherwise it is "pending" while a balance is owed and "paid" once cleared.
  const stampStatus =
    status === "draft" || status === "cancelled"
      ? status
      : payment.balance
        ? "pending"
        : "completed";

  return (
    <div className={`mx-auto w-full max-w-2xl space-y-3 lg:max-w-6xl ${className}`}>
      <style>{PRINT_PAGE}</style>

      {showActions && <BillActions onPrint={onPrint} />}

      <article
        aria-label={`Summary bill ${summary.bill_no ?? ""}`}
        className="overflow-hidden rounded-lg border border-zinc-300 bg-white text-zinc-900 shadow-sm print:rounded-none print:border-0 print:shadow-none"
      >
        <BillHeader branch={branch} summary={summary} status={stampStatus} />

        <div className="lg:flex">
          {/* Who and what: member, subscription, period and the items. */}
          <div className="min-w-0 lg:flex-1">
            <div className="grid border-b border-zinc-300 sm:grid-cols-2">
              <MemberDetails member={member} className="sm:border-r sm:border-zinc-300" />
              <SubscriptionDetails
                summary={summary}
                branch={branch}
                issuedBy={issued_by}
                className="border-t border-zinc-300 sm:border-t-0"
              />
            </div>

            <MembershipPeriod
              startDate={summary.start_date}
              endDate={summary.end_date}
              today={today ?? fallbackToday}
            />

            <BillItems items={items} money={money} />
          </div>

          {/* The tear-off stub: what it adds up to and how it was paid.
              Below the items on phones, to the right on wide screens. */}
          <aside
            aria-label="Totals and payment"
            className="relative border-t-2 border-dashed border-zinc-400 bg-zinc-50 lg:w-88 lg:shrink-0 lg:border-t-0 lg:border-l-2 print:break-inside-avoid [print-color-adjust:exact]"
          >
            <span aria-hidden="true" className={`${NOTCH} -top-3.5 -left-3.5 lg:hidden`} />
            <span aria-hidden="true" className={`${NOTCH} -top-3.5 -right-3.5 lg:hidden`} />

            <PriceSummary
              summary={summary}
              payment={payment}
              status={status}
              money={money}
            />
            <PaymentInfo
              status={status}
              payment={payment}
              className="border-t border-zinc-300"
            />
          </aside>
        </div>

        <TermsAndConditions terms={terms} className="border-t border-zinc-300" />

        <BillFooter branch={branch} />
      </article>
    </div>
  );
}

export default SummaryBill;
