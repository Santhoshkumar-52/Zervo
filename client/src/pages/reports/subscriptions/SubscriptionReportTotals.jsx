import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMoney } from "@/utils/currency";

const EMPTY = "\u2014";

// One line of the modal: the label on the left, its figure on the right.
function Stat({ label, children, tone = "", strong = false }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2 ${
        strong ? "border-t font-semibold" : ""
      }`}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-medium tabular-nums ${tone} ${strong ? "text-base" : ""}`}>
        {children}
      </dd>
    </div>
  );
}

/**
 * A "?" button that opens a modal with the totals of the whole report (every
 * bill in the date range and search, not just the current page).
 *
 *   <SubscriptionReportTotals totals={data?.totals} billCount={total} />
 *
 * totals: { total_amount, total_cash, total_card, total_upi, total_other,
 *           total_paid, total_balance }   (minor units, from /subscription/list)
 * billCount: number of bills in the result.
 *
 * Figures show a dash until the totals have loaded. The balance turns red
 * while something is still owed. "Other" (a method that is not cash, card or
 * UPI) only appears when it has an amount, so the lines add up either way.
 * `className` goes on the "?" button.
 */
function SubscriptionReportTotals({ totals, billCount, className = "" }) {
  const money = (minor) => (totals ? formatMoney(minor) : EMPTY);
  const hasOther = Number(totals?.total_other) > 0;
  const hasBalance = Number(totals?.total_balance) > 0;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Show report totals"
            className={className}
          />
        }
      >
        <CircleHelp />
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report totals</DialogTitle>
          <DialogDescription>
            Adds up every bill in the selected date range and search, not just
            this page.
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-y">
          <Stat label="Total bills">
            {totals && billCount != null
              ? billCount.toLocaleString("en-IN")
              : EMPTY}
          </Stat>
          <Stat label="Cash">{money(totals?.total_cash)}</Stat>
          <Stat label="Card">{money(totals?.total_card)}</Stat>
          <Stat label="UPI">{money(totals?.total_upi)}</Stat>
          {hasOther && <Stat label="Other">{money(totals?.total_other)}</Stat>}
          <Stat label="Balance" tone={hasBalance ? "text-destructive" : ""}>
            {money(totals?.total_balance)}
          </Stat>
          <Stat label="Total (bill amount)">{money(totals?.total_amount)}</Stat>
          <Stat label="Total paid" strong>
            {money(totals?.total_paid)}
          </Stat>
        </dl>
      </DialogContent>
    </Dialog>
  );
}

export default SubscriptionReportTotals;