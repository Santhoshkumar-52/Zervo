import { useQuery } from "@tanstack/react-query";

import { getDueBillList } from "@/api/subscription/subscriptionApi";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import BalanceReportList from "@/pages/reports/balance/BalanceReportList";
import { formatMoney } from "@/utils/currency";

const EMPTY = "\u2014";

/**
 * Summary of every bill that still owes money: how many bills are pending and
 * the total amount due. It does not follow the search of the list below. One
 * bill is asked for because only `totals` is used, and `totals` always covers
 * every due bill.
 *
 *   GET /api/subscription/due   totals: { bill_count, total_balance, ... }
 *
 * The key starts with "balance-report", so paying a due (which refreshes that
 * key) refreshes this summary too.
 */
function DueSummary() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["balance-report", "summary"],
    queryFn: () => getDueBillList({ page: 1, limit: 1 }),
  });

  const totals = data?.totals;
  const hasBalance = Number(totals?.total_balance) > 0;

  const tiles = [
    {
      label: "Total bills pending",
      value: totals
        ? Number(totals.bill_count).toLocaleString("en-IN")
        : EMPTY,
    },
    {
      label: "Total amount due",
      value: totals ? formatMoney(totals.total_balance) : EMPTY,
      tone: hasBalance ? "text-destructive" : "",
    },
  ];

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Summary</h3>

      <dl
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        aria-busy={isLoading}
      >
        {tiles.map(({ label, value, tone = "" }) => (
          <div key={label} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>
              {isLoading ? <Skeleton className="h-7 w-24" /> : value}
            </dd>
          </div>
        ))}
      </dl>

      {isError && (
        <p className="text-xs text-destructive" role="alert">
          Could not load the summary
        </p>
      )}
    </section>
  );
}

// Due tab: the summary of what is pending, then the same balance report list
// as Reports > Balance (search, paging and the Pay button).
function DueSubscription() {
  return (
    <div className="space-y-6 text-base">
      <DueSummary />

      <Card>
        <CardContent>
          <BalanceReportList />
        </CardContent>
      </Card>
    </div>
  );
}

export default DueSubscription;
