import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currency, formatMoney } from "@/utils/currency";

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

const toMinor = (text) => Math.round(Number(text) * 100);

const isCashMethod = (method) =>
  method?.label?.trim().toLowerCase() === "cash";

// The server sends the link to open in `payment.bill_url` (CLIENT_URL + the
// branch's subbill_url + ?id=<bill_no>). This relative link is only a fallback
// for when the server could not build it.
const getBillUrl = (payment) =>
  payment.bill_url ?? `/summary-bill?id=${encodeURIComponent(payment.bill_no)}`;

// Checks run on Pay. The amount is typed in major units (e.g. 1593.50) and
// compared in minor units. Only cash may be more than the grand total (the
// customer hands over a larger note and gets change back).
const createPaySchema = ({ grandTotalMinor, isCash }) =>
  z
    .object({
      paid_price: z.string().trim(),
    })
    .superRefine((data, ctx) => {
      const addError = (message) =>
        ctx.addIssue({ code: "custom", path: ["paid_price"], message });

      const text = data.paid_price;

      if (!text) return addError("Enter the paid price");

      if (!AMOUNT_PATTERN.test(text)) {
        return addError("Enter a valid amount (max 2 decimals)");
      }

      const paidMinor = toMinor(text);

      if (!(paidMinor > 0)) {
        return addError("Paid price must be greater than 0");
      }

      if (!isCash && paidMinor > Number(grandTotalMinor)) {
        addError("Only cash can be more than the grand total");
      }
    });

// Pinned to the bottom of the viewport while the page scrolls. It lives inside
// the page, so it stays clear of the sidebar. The negative margins cancel the
// page padding so the bar runs edge to edge.
//
// The item count and the grand total sit together on the left. The payment
// method dropdown is enabled once the bill has at least one item.
// `paymentMethods` is `[{ value, label }]`; `paymentMethodId` is the chosen
// value (or null) and `onPaymentMethodChange(value)` reports a new choice.
//
// The paid price starts as the grand total and can be changed. When Pay is
// clicked it is validated (zod); only if it passes does
// `onPay({ paidPriceMinor })` run. Pay is disabled while `isPaying`.
//
// `onPay` should return the payment result (with `bill_no`) when the payment
// is saved, and nothing when it fails. After a saved payment the bill opens in
// a new tab at the `bill_url` the server sent back.
function SubscriptionFooter({
  itemCount,
  grandTotalMinor,
  paymentMethods = [],
  paymentMethodId = null,
  onPaymentMethodChange,
  isPaymentMethodsLoading = false,
  onPay,
  isPaying = false,
}) {
  const hasPaymentMethods = paymentMethods.length > 0;

  // What the user typed, tied to the grand total it was typed for. When the
  // total changes (item added, bill paid) the field goes back to the total.
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState("");

  const defaultPaidPrice =
    itemCount > 0 ? (Number(grandTotalMinor) / 100).toFixed(2) : "";
  const paidPrice =
    edit && edit.forTotal === grandTotalMinor ? edit.value : defaultPaidPrice;

  const selectedMethod = paymentMethods.find(
    (method) => method.value === paymentMethodId,
  );

  const handlePaidPriceChange = (event) => {
    setEdit({ forTotal: grandTotalMinor, value: event.target.value });
    setError("");
  };

  const handlePay = async () => {
    const result = createPaySchema({
      grandTotalMinor,
      isCash: isCashMethod(selectedMethod),
    }).safeParse({ paid_price: paidPrice });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Enter a valid paid price");
      return;
    }

    setError("");

    // Open the tab now, while the click is still fresh, so the browser's popup
    // blocker lets it through. It is pointed at the bill once the payment is
    // saved, and closed again if the payment fails.
    const billTab = window.open("about:blank", "_blank");

    let payment;

    try {
      payment = await onPay?.({ paidPriceMinor: toMinor(result.data.paid_price) });
    } catch {
      payment = null;
    }

    if (payment?.bill_no) {
      if (billTab) {
        billTab.location.href = getBillUrl(payment);
      } else {
        // The popup was blocked: open it now as a fallback.
        window.open(getBillUrl(payment), "_blank");
      }
    } else {
      billTab?.close();
    }
  };

  return (
    <div className="sticky bottom-0 z-20 -mx-4 -mb-4 flex items-center justify-between gap-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:-mb-6 md:px-6">
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>

        <div className="flex flex-col leading-tight">
          <span className="text-xs text-muted-foreground">Grand total</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatMoney(grandTotalMinor)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select
          items={paymentMethods}
          value={paymentMethodId}
          onValueChange={onPaymentMethodChange}
          disabled={itemCount === 0 || isPaymentMethodsLoading || !hasPaymentMethods}
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
            aria-label="Paid price"
            aria-invalid={Boolean(error)}
            placeholder={currency ? `Paid (${currency})` : "Paid price"}
            className="w-32 tabular-nums"
            value={paidPrice}
            onChange={handlePaidPriceChange}
            disabled={itemCount === 0 || isPaying}
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

        <Button onClick={handlePay} disabled={itemCount === 0 || isPaying}>
          Pay
        </Button>
      </div>
    </div>
  );
}

export default SubscriptionFooter;
