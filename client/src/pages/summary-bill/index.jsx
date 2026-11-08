import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileQuestion, ReceiptText, ServerCrash } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getSummaryBill } from "@/api/subscription/subscriptionApi";
import SummaryBill from "@/components/additonal/SummaryBill";

// /summary-bill?id=1042 - `id` is the bill number (subs_summ.bill_no).
// /summary-bill?id=1042&receipt=17 - `receipt` (optional) is a due receipt of
// that bill; the payment then shows as it stood at that receipt.
// Kept outside AppLayout so the bill gets the whole page and prints cleanly.
//
// This page does not use the app theme. Colours are fixed (zinc, with the bill's
// own status colours) so the bill looks the same in light and dark mode.
const parseBillNo = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const BUTTON =
  "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";
const BUTTON_OUTLINE = `${BUTTON} border border-zinc-400 bg-white text-zinc-900 hover:bg-zinc-100`;
const BUTTON_SOLID = `${BUTTON} bg-zinc-900 text-white hover:bg-zinc-700`;

// Same width as the bill: a portrait column on phones, wide on large screens.
const SHEET_WIDTH = "mx-auto w-full max-w-2xl lg:max-w-6xl";

function Notice({ icon: Icon, title, description, children }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-lg border border-zinc-300 bg-white px-6 py-10 text-center shadow-sm">
      <div className="flex size-14 items-center justify-center rounded-full bg-zinc-100">
        <Icon aria-hidden="true" className="size-7 text-zinc-700" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-zinc-900">{title}</h2>
      <p className="mt-1.5 text-sm text-zinc-600">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

function BillSkeleton() {
  const bar = "animate-pulse rounded-md bg-zinc-300";

  return (
    <div className={`${SHEET_WIDTH} space-y-3`} aria-busy="true" aria-label="Loading bill">
      <div className={`${bar} h-32`} />
      <div className={`${bar} h-40`} />
      <div className={`${bar} h-64`} />
    </div>
  );
}

function SummaryBillPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const billNo = parseBillNo(searchParams.get("id"));
  const receiptId = parseBillNo(searchParams.get("receipt"));

  const { data: bill, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["summary-bill", billNo, receiptId],
    queryFn: () => getSummaryBill(billNo, receiptId),
    enabled: billNo !== null,
    // A missing bill won't appear on a retry.
    retry: (count, err) => err?.response?.status !== 404 && count < 1,
  });

  const goToSubscriptions = (
    <button type="button" className={BUTTON_SOLID} onClick={() => navigate("/subscriptions")}>
      Go to subscriptions
    </button>
  );

  let content;

  if (billNo === null) {
    content = (
      <Notice
        icon={ReceiptText}
        title="No bill selected"
        description="Open a bill with its number in the link, for example /summary-bill?id=1042."
      >
        {goToSubscriptions}
      </Notice>
    );
  } else if (isLoading) {
    content = <BillSkeleton />;
  } else if (isError && error?.response?.status === 404) {
    content = (
      <Notice
        icon={FileQuestion}
        title={`Bill #${billNo} not found`}
        description="Check the bill number, or open the bill from the subscriptions page."
      >
        {goToSubscriptions}
      </Notice>
    );
  } else if (isError) {
    content = (
      <Notice
        icon={ServerCrash}
        title="Couldn't load this bill"
        description={
          error?.response?.data?.message ||
          "Something went wrong on our side. Try again in a moment."
        }
      >
        <button type="button" className={BUTTON_OUTLINE} onClick={() => refetch()}>
          Try again
        </button>
      </Notice>
    );
  } else {
    content = <SummaryBill bill={bill} />;
  }

  return (
    <div className="min-h-screen bg-zinc-200 px-3 py-4 text-zinc-900 sm:px-6 sm:py-8 print:min-h-0 print:bg-white print:p-0">
      <div className={`${SHEET_WIDTH} mb-3 flex print:hidden`}>
        <button type="button" className={BUTTON_OUTLINE} onClick={() => navigate(-1)}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back
        </button>
      </div>

      {content}
    </div>
  );
}

export default SummaryBillPage;
