import { useQuery } from "@tanstack/react-query";

import { getBillDetails } from "@/api/subscription/subscriptionApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import {
  AmountTiles,
  BillPanel,
  MemberPanel,
  Section,
  TransactionsTable,
} from "./BalanceDueSections";

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

function DetailsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading bill">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>

      <Skeleton className="h-24" />
    </div>
  );
}

/**
 * Balance due modal: opens from the Pay button of the balance report. It loads
 * one bill from the server and shows the amounts, the member, the bill and the
 * payments received so far.
 *
 *   GET /api/subscription/details?bill_no=
 *
 *   <BalanceDueDialog open={open} onOpenChange={setOpen} billNo={bill.bill_no} />
 */
function BalanceDueDialog({ open, onOpenChange, billNo }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["bill-details", billNo],
    queryFn: () => getBillDetails(billNo),
    // Only call the API while the modal is open and there is a bill.
    enabled: Boolean(open && billNo),
    // Always stale, so every open fetches the latest payments. Data from an
    // earlier open stays on screen while the new request is running.
    staleTime: 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader className="pr-10">
          <DialogTitle>Balance due</DialogTitle>
          <DialogDescription>
            {billNo ? `Bill ${billNo}` : "Bill"} - member, bill and payments so
            far
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
          {isLoading && <DetailsSkeleton />}

          {isError && !data && (
            <div className="space-y-3" role="alert">
              <p className="text-sm text-destructive">
                {getApiError(error, "Failed to load the bill")}
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? "Retrying..." : "Try again"}
              </Button>
            </div>
          )}

          {data && (
            <>
              <AmountTiles
                total={data.summary.total_price}
                paid={data.balance.paid_minor}
                balance={data.balance.balance_minor}
              />

              {!data.balance.is_due && (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  {data.balance.written_off
                    ? "The balance on this bill was written off."
                    : "This bill has no balance due."}
                </p>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Section title="Member">
                  <MemberPanel member={data.member} />
                </Section>

                <Section title="Bill">
                  <BillPanel
                    summary={data.summary}
                    items={data.items}
                    payment={data.payment}
                    issuedBy={data.issued_by}
                  />
                </Section>
              </div>

              <Section title="Transactions">
                <TransactionsTable
                  transactions={data.transactions}
                  paid={data.balance.paid_minor}
                  balance={data.balance.balance_minor}
                />
              </Section>
            </>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

export default BalanceDueDialog;
