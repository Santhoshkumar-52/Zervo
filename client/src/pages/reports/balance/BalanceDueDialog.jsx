import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import {
  getBillDetails,
  payDueAmount,
} from "@/api/subscription/subscriptionApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentMethods } from "@/pages/subscriptions/usePaymentMethods";
import { currency, formatMoney } from "@/utils/currency";
import { notifyError, notifySuccess } from "@/utils/notification";

import {
  AmountTiles,
  BillPanel,
  MemberPanel,
  Section,
  TransactionsTable,
} from "./BalanceDueSections";

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

const toMinor = (text) => Math.round(Number(text) * 100);

const isCashMethod = (method) =>
  method?.label?.trim().toLowerCase() === "cash";

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

// Checks run on Pay. The amount is typed in major units (e.g. 1593.50) and
// compared in minor units. Only cash may be more than the balance due (the
// customer hands over a larger note and gets change back).
const createPaySchema = ({ balanceMinor, isCash }) =>
  z
    .object({
      paid_amount: z.string().trim(),
    })
    .superRefine((data, ctx) => {
      const addError = (message) =>
        ctx.addIssue({ code: "custom", path: ["paid_amount"], message });

      const text = data.paid_amount;

      if (!text) return addError("Enter the paid amount");

      if (!AMOUNT_PATTERN.test(text)) {
        return addError("Enter a valid amount (max 2 decimals)");
      }

      const paidMinor = toMinor(text);

      if (!(paidMinor > 0)) {
        return addError("Paid amount must be greater than 0");
      }

      if (!isCash && paidMinor > Number(balanceMinor)) {
        addError("Only cash can be more than the balance due");
      }
    });

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
 * Payment method, paid amount and Pay button for the balance still due on one
 * bill (same layout as the subscription footer).
 *
 *   POST /api/subscription/due/pay  { payment_id, bill_no, paid_amount }
 *
 * The paid amount starts as the balance due and can be changed (a part
 * payment). It is validated (zod) before anything is sent. A part payment keeps
 * the modal open so the new balance and transaction show up; paying the whole
 * balance calls `onCleared`.
 */
function PayDueForm({ billNo, balanceMinor, onCleared }) {
  const queryClient = useQueryClient();
  const { paymentMethods, isLoading: isPaymentMethodsLoading } =
    usePaymentMethods();
  const hasPaymentMethods = paymentMethods.length > 0;

  const [paymentMethodId, setPaymentMethodId] = useState(null);
  // What the user typed, tied to the balance it was typed for. When the
  // balance changes (a payment was made) the field goes back to the balance.
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState("");

  const defaultPaidAmount = (Number(balanceMinor) / 100).toFixed(2);
  const paidAmount =
    edit && edit.forBalance === balanceMinor ? edit.value : defaultPaidAmount;

  const selectedMethod = paymentMethods.find(
    (method) => method.value === paymentMethodId,
  );

  const { mutateAsync: pay, isPending: isPaying } = useMutation({
    mutationFn: payDueAmount,
    onSuccess: () => {
      // Everything that shows this bill's payments or the due balances.
      queryClient.invalidateQueries({ queryKey: ["bill-details", billNo] });
      queryClient.invalidateQueries({ queryKey: ["summary-bill", billNo] });
      queryClient.invalidateQueries({ queryKey: ["balance-report"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-report"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (apiError) =>
      notifyError(getApiError(apiError, "Could not record the payment")),
  });

  const handlePaidAmountChange = (event) => {
    setEdit({ forBalance: balanceMinor, value: event.target.value });
    setError("");
  };

  const handlePay = async () => {
    if (!paymentMethodId) {
      notifyError("Select a payment method");
      return;
    }

    const result = createPaySchema({
      balanceMinor,
      isCash: isCashMethod(selectedMethod),
    }).safeParse({ paid_amount: paidAmount });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Enter a valid amount");
      return;
    }

    setError("");

    let paid;

    try {
      paid = await pay({
        payment_id: paymentMethodId,
        bill_no: billNo,
        paid_amount: toMinor(result.data.paid_amount),
      });
    } catch {
      // The mutation shows the error; keep the chosen method and amount.
      return;
    }

    if (paid.payments_status === "completed") {
      notifySuccess(
        paid.change > 0
          ? `Due paid in full. Change to return: ${formatMoney(paid.change)}`
          : "Due amount paid in full",
      );
      onCleared?.();
      return;
    }

    notifySuccess(
      `Part payment recorded. Balance due: ${formatMoney(paid.balance)}`,
    );
    setPaymentMethodId(null);
    setEdit(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
      <Select
        items={paymentMethods}
        value={paymentMethodId}
        onValueChange={setPaymentMethodId}
        disabled={isPaymentMethodsLoading || !hasPaymentMethods || isPaying}
      >
        <SelectTrigger aria-label="Payment method" className="w-40">
          <SelectValue
            placeholder={
              isPaymentMethodsLoading
                ? "Loading..."
                : hasPaymentMethods
                  ? "Payment method"
                  : "No payment methods"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {paymentMethods.map((method) => (
            <SelectItem key={method.value} value={method.value}>
              {method.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          aria-label="Paid amount"
          aria-invalid={Boolean(error)}
          placeholder={currency ? `Paid (${currency})` : "Paid amount"}
          className="w-32 tabular-nums"
          value={paidAmount}
          onChange={handlePaidAmountChange}
          disabled={isPaying}
        />
        {error && (
          <p
            role="alert"
            className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded bg-background px-1 text-xs text-destructive"
          >
            {error}
          </p>
        )}
      </div>

      <Button onClick={handlePay} disabled={isPaying}>
        {isPaying ? "Paying..." : "Pay"}
      </Button>
    </div>
  );
}

/**
 * Balance due modal: opens from the Pay button of the balance report. It loads
 * one bill from the server and shows the amounts, the member, the bill and the
 * payments received so far. While the bill is still due, the footer takes a
 * payment (all or part of the balance).
 *
 *   GET  /api/subscription/details?bill_no=
 *   POST /api/subscription/due/pay
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

        <DialogFooter showCloseButton className="sm:items-center">
          {data?.balance.is_due && (
            <PayDueForm
              billNo={billNo}
              balanceMinor={data.balance.balance_minor}
              onCleared={() => onOpenChange(false)}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BalanceDueDialog;
