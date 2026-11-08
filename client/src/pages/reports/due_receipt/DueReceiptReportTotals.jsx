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
 * A "?" button that opens a modal with the totals of every due receipt in the
 * selected date range and search (not just the current page).
 *
 *   <DueReceiptReportTotals totals={data?.totals} className="ml-auto" />
 *
 * totals: { payment_count, total_received }
 *         (minor units, from /subscription/due/payments)
 *
 * Figures show a dash until the totals have loaded. `className` goes on the
 * "?" button.
 */
function DueReceiptReportTotals({ totals, className = "" }) {
  const money = (minor) => (totals ? formatMoney(minor) : EMPTY);

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
            Adds up every due receipt in the selected date range and search, not
            just this page.
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-y">
          <Stat label="Total receipts">
            {totals
              ? Number(totals.payment_count).toLocaleString("en-IN")
              : EMPTY}
          </Stat>
          <Stat label="Total received" strong>
            {money(totals?.total_received)}
          </Stat>
        </dl>
      </DialogContent>
    </Dialog>
  );
}

export default DueReceiptReportTotals;
