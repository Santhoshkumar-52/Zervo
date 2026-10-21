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
      <dd
        className={`font-medium tabular-nums ${tone} ${strong ? "text-base" : ""}`}
      >
        {children}
      </dd>
    </div>
  );
}

/**
 * A "?" button that opens a modal with the totals of every due bill matching
 * the search (not just the current page).
 *
 *   <BalanceReportTotals totals={data?.totals} />
 *
 * totals: { bill_count, total_amount, total_paid, total_balance }
 *         (minor units, from /subscription/due)
 *
 * Figures show a dash until the totals have loaded. `className` goes on the
 * "?" button.
 */
function BalanceReportTotals({ totals, className = "" }) {
  const money = (minor) => (totals ? formatMoney(minor) : EMPTY);
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
            Adds up every due bill that matches the search, not just this page.
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-y">
          <Stat label="Bills due">
            {totals ? Number(totals.bill_count).toLocaleString("en-IN") : EMPTY}
          </Stat>
          <Stat label="Total (bill amount)">{money(totals?.total_amount)}</Stat>
          <Stat label="Total paid">{money(totals?.total_paid)}</Stat>
          <Stat
            label="Balance due"
            tone={hasBalance ? "text-destructive" : ""}
            strong
          >
            {money(totals?.total_balance)}
          </Stat>
        </dl>
      </DialogContent>
    </Dialog>
  );
}

export default BalanceReportTotals;
