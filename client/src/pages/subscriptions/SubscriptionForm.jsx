import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, isValid, parse } from "date-fns";
import { LoaderCircle, Plus, ReceiptText } from "lucide-react";

import { getDiscountTypes } from "@/api/subscription/subscriptionApi";
import AsyncCombobox from "@/components/additonal/AsyncCombobox";
import DatePicker from "@/components/additonal/DatePicker";
import Field from "@/components/additonal/Field";
import ProfileViewer from "@/components/additonal/ProfileViewer";
import MemberEditor from "@/pages/members/MemberEditor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateTotals, DISCOUNT_TYPE } from "@/utils/billing";
import { currency, formatMoney } from "@/utils/currency";
import { notifySuccess } from "@/utils/notification";

import PlanInfo from "./PlanInfo";
import SelectedMember from "./SelectedMember";
import { memberSource, planSource, taxSource } from "./optionSources";
import { getDefaultValues, subscriptionSchema } from "./subscriptionSchema";

const READ_ONLY_CLASS = "bg-muted/40 tabular-nums";
const VALUE_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "dd MMM yyyy";

const getDiscountValueLabel = (type) => {
  if (type === DISCOUNT_TYPE.PERCENTAGE) return "Discount value (%)";
  if (type === DISCOUNT_TYPE.FIXED && currency) {
    return `Discount value (${currency})`;
  }

  return "Discount value";
};

// Start date counts as day 1, so end = start + (duration_days - 1). Returns null (so the field shows empty) when
// there is no valid start date or no plan with a duration.
const getEndDate = (startDate, plan) => {
  const days = Number(plan?.duration_days);

  if (!startDate || !(days > 0)) return null;

  const start = parse(startDate, VALUE_FORMAT, new Date());

  return isValid(start) ? addDays(start, days - 1) : null;
};

/**
 * Form for one bill item. Adding it sends the item to `onAddItem(payload)`;
 * the server calculates the amounts, so the figures here are a preview.
 *
 *   <SubscriptionForm hasItems={items.length > 0} onAddItem={addItem} />
 *
 * Member and bill date belong to the whole bill, so they are locked once the
 * bill has items. The plan, start date, tax and discount reset for the next
 * item. The end date is never typed: it is the last day of the plan's
 * `duration_days` (start date is day 1), and it is empty until both are chosen.
 */
function SubscriptionForm({ hasItems = false, onAddItem }) {
  // Profile modal of the member picked in the dropdown.
  const [profileOpen, setProfileOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: getDefaultValues(format(new Date(), VALUE_FORMAT)),
  });

  const { data: discountTypes = [] } = useQuery({
    queryKey: ["discount-types"],
    queryFn: getDiscountTypes,
    staleTime: Infinity,
  });

  const [member, plan, startDate, tax, discountType, discountValue] = useWatch({
    control,
    name: [
      "member",
      "plan",
      "start_date",
      "tax",
      "discount_type",
      "discount_value",
    ],
  });

  const totals = calculateTotals({
    priceMinor: plan?.price_minor,
    discountType,
    discountValue,
    taxRate: tax?.rate,
  });

  // Derived, so it clears by itself when the start date or the plan is cleared.
  const endDate = getEndDate(startDate, plan);

  const discountItems = discountTypes.map(({ id, name }) => ({
    value: id,
    label: name,
  }));
  const isLocked = hasItems && Boolean(member);
  const hasDiscount = discountType !== DISCOUNT_TYPE.NONE;

  const handleDiscountTypeChange = (nextType, field) => {
    field.onChange(nextType);

    if (nextType === DISCOUNT_TYPE.NONE) {
      setValue("discount_value", "");
      clearErrors("discount_value");
    }
  };

  const submit = async (values) => {
    try {
      await onAddItem({
        member_id: values.member.id,
        plan_id: values.plan.id,
        tax_id: values.tax?.id ?? null,
        discount_type: values.discount_type,
        discount_value: hasDiscount ? Number(values.discount_value) : 0,
        bill_date: values.bill_date,
        start_date: values.start_date,
      });
    } catch {
      // The caller shows the error; keep the form as it is.
      return;
    }

    notifySuccess("Item added to the bill");

    // Next item: keep the member and date, clear the rest (start and end date
    // included).
    reset({ ...getDefaultValues(values.bill_date), member: values.member });
  };

  return (
    <Card>
      {/* From `md` the selected member sits in the right column, lined up
          with the Bill date field below; on phones it stacks under the text. */}
      <CardHeader className="md:grid-cols-2 md:gap-x-4">
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="size-5" />
          New subscription
        </CardTitle>

        <CardDescription>
          Choose a member and a plan, then add it to the bill.
        </CardDescription>

        {member?.id && (
          <div className="mt-2 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0">
            <SelectedMember
              member={member}
              onOpen={() => setProfileOpen(true)}
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        <form
          noValidate
          onSubmit={handleSubmit(submit)}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <Field
            label="Member"
            htmlFor="subscription-member"
            required
            error={errors.member?.message}
          >
            <Controller
              name="member"
              control={control}
              render={({ field }) => (
                <AsyncCombobox
                  id="subscription-member"
                  source={memberSource}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Search member..."
                  disabled={isLocked}
                  invalid={Boolean(errors.member)}
                />
              )}
            />
            {isLocked && (
              <p className="text-xs text-muted-foreground">
                Locked while the bill has items.
              </p>
            )}
          </Field>

          <Field
            label="Bill date"
            htmlFor="subscription-bill-date"
            required
            error={errors.bill_date?.message}
          >
            <Controller
              name="bill_date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="subscription-bill-date"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isLocked}
                />
              )}
            />
          </Field>

          <Field
            label="Plan"
            htmlFor="subscription-plan"
            required
            error={errors.plan?.message}
          >
            <Controller
              name="plan"
              control={control}
              render={({ field }) => (
                <AsyncCombobox
                  id="subscription-plan"
                  source={planSource}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Search plan..."
                  invalid={Boolean(errors.plan)}
                />
              )}
            />
            <p className="flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
              {plan ? (
                <>
                  Price: {formatMoney(plan.price_minor)}
                  <PlanInfo plan={plan} />
                </>
              ) : (
                "Select a plan to see its price."
              )}
            </p>
          </Field>

          <Field
            label="Start date"
            htmlFor="subscription-start-date"
            required
            error={errors.start_date?.message}
          >
            <Controller
              name="start_date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="subscription-start-date"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pick start date"
                  endYear={new Date().getFullYear() + 5}
                />
              )}
            />
          </Field>

          <Field label="End date" htmlFor="subscription-end-date">
            <Input
              id="subscription-end-date"
              readOnly
              value={endDate ? format(endDate, DISPLAY_FORMAT) : ""}
              placeholder="Select a plan and start date"
              className={READ_ONLY_CLASS}
            />
          </Field>

          <Field label="Tax" htmlFor="subscription-tax">
            <Controller
              name="tax"
              control={control}
              render={({ field }) => (
                <AsyncCombobox
                  id="subscription-tax"
                  source={taxSource}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="No tax"
                  clearable
                />
              )}
            />
            <p className="flex min-h-5 items-center text-xs text-muted-foreground">
              {tax ? `Rate: ${Number(tax.rate)}%` : "No tax applied."}
            </p>
          </Field>

          <Field label="Discount type" htmlFor="subscription-discount-type">
            <Controller
              name="discount_type"
              control={control}
              render={({ field }) => (
                <Select
                  items={discountItems}
                  value={field.value}
                  onValueChange={(next) => handleDiscountTypeChange(next, field)}
                  disabled={discountItems.length === 0}
                >
                  <SelectTrigger
                    id="subscription-discount-type"
                    className="w-full"
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {discountItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            label={getDiscountValueLabel(discountType)}
            htmlFor="subscription-discount-value"
            error={errors.discount_value?.message}
          >
            <Controller
              name="discount_value"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="subscription-discount-value"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder={hasDiscount ? "e.g. 10" : "No discount"}
                  disabled={!hasDiscount}
                  aria-invalid={Boolean(errors.discount_value)}
                />
              )}
            />
          </Field>

          <Field label="Tax amount" htmlFor="subscription-tax-amount">
            <Input
              id="subscription-tax-amount"
              readOnly
              value={formatMoney(totals.taxMinor)}
              className={READ_ONLY_CLASS}
            />
          </Field>

          <Field label="Total price" htmlFor="subscription-total-price">
            <div className="flex items-center gap-2">
              <Input
                id="subscription-total-price"
                readOnly
                value={formatMoney(totals.totalMinor)}
                className={`${READ_ONLY_CLASS} flex-1 font-semibold`}
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Add item to the bill"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Plus />
                )}
              </Button>
            </div>
            {totals.discountMinor > 0 && (
              <p className="text-xs text-muted-foreground">
                Includes a discount of {formatMoney(totals.discountMinor)}.
              </p>
            )}
          </Field>
        </form>
      </CardContent>

      <ProfileViewer
        open={profileOpen}
        onOpenChange={setProfileOpen}
        memberId={member?.id ?? null}
        onEdit={() => setEditOpen(true)}
      />

      {/* After a save, keep the dropdown's selected member up to date. */}
      <MemberEditor
        open={editOpen}
        onOpenChange={setEditOpen}
        memberId={member?.id ?? null}
        onSaved={(updated) => setValue("member", { ...member, ...updated })}
      />
    </Card>
  );
}

export default SubscriptionForm;
