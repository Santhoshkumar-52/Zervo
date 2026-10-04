import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import Field from "@/components/additonal/Field";
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
import { Switch } from "@/components/ui/switch";

// Number fields are kept as text in the form and converted on submit.
const isWholeNumber = (value) => /^\d+$/.test(value);

const planSchema = z
  .object({
    name: z.string().trim().min(1, "Plan name is required").max(100),
    duration_days: z
      .string()
      .trim()
      .min(1, "Duration is required")
      .refine(isWholeNumber, "Enter a whole number of days")
      .refine(
        (value) => Number(value) >= 1 && Number(value) <= 3650,
        "Duration must be between 1 and 3650 days",
      ),
    // Entered in rupees, saved in paise.
    price: z
      .string()
      .trim()
      .min(1, "Price is required")
      .refine(
        (value) => /^\d+(\.\d{1,2})?$/.test(value),
        "Enter a valid amount (max 2 decimals)",
      ),
    max_freeze_days: z
      .string()
      .trim()
      .min(1, "Enter 0 if freezing is not allowed")
      .refine(isWholeNumber, "Enter a whole number of days"),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      isWholeNumber(data.duration_days) &&
      isWholeNumber(data.max_freeze_days) &&
      Number(data.max_freeze_days) > Number(data.duration_days)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["max_freeze_days"],
        message: "Cannot be more than the plan duration",
      });
    }
  });

// With no plan (create mode) the form starts empty and active.
const toFormValues = (plan) => ({
  name: plan?.name ?? "",
  duration_days:
    plan?.duration_days != null ? String(plan.duration_days) : "",
  // paise -> rupees
  price: plan?.price_minor != null ? String(Number(plan.price_minor) / 100) : "",
  max_freeze_days:
    plan?.max_freeze_days != null ? String(plan.max_freeze_days) : "0",
  is_active: plan ? Boolean(plan.is_active) : true,
});

/**
 * Dialog to add or edit a plan.
 *
 *   <EditPlanDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     plan={plan}               // null in create mode
 *     mode="edit"               // "edit" | "create"
 *     onSubmit={(values, plan) => ...}
 *   />
 *
 * `values`: { name, duration_days, price_minor, max_freeze_days, is_active }
 * If `onSubmit` returns a promise the dialog closes when it resolves and
 * stays open when it rejects.
 */
function EditPlanDialog({
  open,
  onOpenChange,
  plan,
  onSubmit,
  isLoading = false,
  mode = "edit",
}) {
  const isCreate = mode === "create";

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(planSchema),
    defaultValues: toFormValues(plan),
  });

  // Load the selected plan into the form each time the dialog opens.
  useEffect(() => {
    if (open) reset(toFormValues(plan));
  }, [open, plan, reset]);

  const submit = async (values) => {
    const payload = {
      name: values.name,
      duration_days: Number(values.duration_days),
      // rupees -> paise (rounded so 19.99 never becomes 1998.9999)
      price_minor: Math.round(Number(values.price) * 100),
      max_freeze_days: Number(values.max_freeze_days),
      is_active: values.is_active,
    };

    try {
      await onSubmit?.(payload, plan);
      onOpenChange?.(false);
    } catch {
      // Keep the dialog open; the caller is responsible for showing the error.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg!">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Add plan" : "Edit plan"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Enter the details of the new plan."
              : `Update the details for ${plan?.name || "this plan"}.`}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={handleSubmit(submit)}
          className="flex flex-col gap-4"
        >
          <Field
            label="Plan name"
            htmlFor="edit-plan-name"
            required
            error={errors.name?.message}
          >
            <Input
              id="edit-plan-name"
              placeholder="e.g. Monthly"
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Duration (days)"
              htmlFor="edit-plan-duration"
              required
              error={errors.duration_days?.message}
            >
              <Input
                id="edit-plan-duration"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="e.g. 30"
                aria-required="true"
                aria-invalid={Boolean(errors.duration_days)}
                {...register("duration_days")}
              />
            </Field>

            <Field
              label="Price (₹)"
              htmlFor="edit-plan-price"
              required
              error={errors.price?.message}
            >
              <Input
                id="edit-plan-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="e.g. 1500"
                aria-required="true"
                aria-invalid={Boolean(errors.price)}
                {...register("price")}
              />
            </Field>

            <Field
              label="Max freeze days"
              htmlFor="edit-plan-max-freeze"
              required
              error={errors.max_freeze_days?.message}
            >
              <Input
                id="edit-plan-max-freeze"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="e.g. 7"
                aria-required="true"
                aria-invalid={Boolean(errors.max_freeze_days)}
                {...register("max_freeze_days")}
              />
            </Field>
          </div>

          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Status</span>
                  <span className="text-xs text-muted-foreground">
                    {field.value ? "Active plan" : "Inactive plan"}
                  </span>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Plan status"
                />
              </div>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (!isCreate && !isDirty)}>
              {isLoading
                ? isCreate
                  ? "Creating..."
                  : "Saving..."
                : isCreate
                  ? "Create plan"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditPlanDialog;
