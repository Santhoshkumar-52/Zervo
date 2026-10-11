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

/**
 * Summary bill for one subscription. Built for members first (they open it on
 * a phone from the branch's subbill_url) and for staff users second.
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
 *   payment: { status, method, paid_on },   // payments_status + payments
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

  return (
    <div className={`mx-auto w-full max-w-4xl space-y-4 ${className}`}>
      {showActions && <BillActions onPrint={onPrint} />}

      <article
        aria-label={`Summary bill ${summary.bill_no ?? ""}`}
        className="overflow-hidden rounded-2xl border bg-card text-card-foreground print:rounded-none print:border-0"
      >
        <BillHeader branch={branch} summary={summary} status={status} />

        <MembershipPeriod
          startDate={summary.start_date}
          endDate={summary.end_date}
          today={today ?? fallbackToday}
        />

        <div className="grid border-b md:grid-cols-2">
          <MemberDetails member={member} className="md:border-r" />
          <SubscriptionDetails
            summary={summary}
            branch={branch}
            issuedBy={issued_by}
            className="border-t md:border-t-0"
          />
        </div>

        <BillItems items={items} money={money} className="border-b" />

        {/* Summary comes first in the markup so phones see the total before the
            payment details; on wide screens payment sits on the left. */}
        <div className="grid border-b md:grid-cols-2">
          <PriceSummary
            summary={summary}
            status={status}
            money={money}
            className="md:order-2"
          />
          <PaymentInfo
            status={status}
            payment={payment}
            className="border-t md:order-1 md:border-t-0 md:border-r"
          />
        </div>

        <TermsAndConditions terms={terms} className="border-b" />

        <BillFooter branch={branch} />
      </article>
    </div>
  );
}

export default SummaryBill;
