import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/utils/currency";

// Pinned to the bottom of the viewport while the page scrolls. It lives inside
// the page, so it stays clear of the sidebar. The negative margins cancel the
// page padding so the bar runs edge to edge.
//
// The payment method dropdown is enabled once the bill has at least one item.
// `paymentMethods` is `[{ value, label }]`; `paymentMethodId` is the chosen
// value (or null) and `onPaymentMethodChange(value)` reports a new choice.
function SubscriptionFooter({
  itemCount,
  grandTotalMinor,
  paymentMethods = [],
  paymentMethodId = null,
  onPaymentMethodChange,
  isPaymentMethodsLoading = false,
  onPay,
}) {
  const hasPaymentMethods = paymentMethods.length > 0;

  return (
    <div className="sticky bottom-0 z-20 -mx-4 -mb-4 flex items-center justify-between gap-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:-mb-6 md:px-6">
      <p className="text-sm text-muted-foreground">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </p>

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

        <div className="flex flex-col items-end leading-tight">
          <span className="text-xs text-muted-foreground">Grand total</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatMoney(grandTotalMinor)}
          </span>
        </div>

        {/* Payment is not wired up yet, so there is no handler by default. */}
        <Button onClick={onPay} disabled={itemCount === 0}>
          Pay
        </Button>
      </div>
    </div>
  );
}

export default SubscriptionFooter;