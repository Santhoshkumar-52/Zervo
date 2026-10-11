import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileQuestion, ReceiptText, ServerCrash } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getSummaryBill } from "@/api/subscription/subscriptionApi";
import SummaryBill from "@/components/additonal/SummaryBill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/pages/public/EmptyState";

// /summary-bill?id=1042 - `id` is the bill number (subs_summ.bill_no).
// Kept outside AppLayout so the bill gets the whole page and prints cleanly.
const parseBillNo = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

function BillSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4" aria-busy="true" aria-label="Loading bill">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function SummaryBillPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const billNo = parseBillNo(searchParams.get("id"));

  const { data: bill, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["summary-bill", billNo],
    queryFn: () => getSummaryBill(billNo),
    enabled: billNo !== null,
    // A missing bill won't appear on a retry.
    retry: (count, err) => err?.response?.status !== 404 && count < 1,
  });

  let content;

  if (billNo === null) {
    content = (
      <EmptyState
        icon={ReceiptText}
        title="No bill selected"
        description="Open a bill with its number in the link, for example /summary-bill?id=1042."
        button
        redirect="/subscriptions"
        buttonText="Go to subscriptions"
      />
    );
  } else if (isLoading) {
    content = <BillSkeleton />;
  } else if (isError && error?.response?.status === 404) {
    content = (
      <EmptyState
        icon={FileQuestion}
        title={`Bill #${billNo} not found`}
        description="Check the bill number, or open the bill from the subscriptions page."
        button
        redirect="/subscriptions"
        buttonText="Go to subscriptions"
      />
    );
  } else if (isError) {
    content = (
      <div className="flex flex-col items-center">
        <EmptyState
          icon={ServerCrash}
          title="Couldn't load this bill"
          description={error?.response?.data?.message || "Something went wrong on our side. Try again in a moment."}
        />
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    content = <SummaryBill bill={bill} />;
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6 sm:py-10 print:bg-transparent print:p-0">
      <div className="mx-auto mb-4 flex w-full max-w-4xl print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
      </div>

      {content}
    </div>
  );
}

export default SummaryBillPage;
