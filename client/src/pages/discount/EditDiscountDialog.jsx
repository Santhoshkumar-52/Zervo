import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import DatePicker from "@/components/additonal/DatePicker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const TYPE_ITEMS = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed amount (₹)" },
];

const discountSchema = z
  .object({
    name: z.string().trim().min(1, "Discount name is required").max(100),
    type: z.enum(["percentage", "fixed"]),
    // Kept as text in the form, converted to a number on submit.
    value: z
      .string()
      .trim()
      .min(1, "Value is required")
      .refine((value) => !Number.isNaN(Number(value)), "Enter a valid number")
      .refine((value) => Number(value) > 0, "Value must be greater than 0"),
    valid_from: z.string().min(1, "Start date is required"),
    valid_to: z.string().min(1, "End date is required"),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percentage" && Number(data.value) > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Percentage cannot be more than 100",
      });
    }

    if (data.valid_from && data.valid_to && data.valid_to < data.valid_from) {
      ctx.addIssue({
        code: "custom",
        path: ["valid_to"],
        message: "End date must be on or after the start date",
      });
    }
  });

// Today as YYYY-MM-DD in the user's local time (default start date).
const today = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
};

// With no discount (create mode) the form starts empty, dated today, and active.
const toFormValues = (discount) => ({
  name: discount?.name ?? "",
  type: discount?.type ?? "percentage",
  value: discount?.value !== undefined ? String(discount.value) : "",
  valid_from: discount?.valid_from ?? today(),
  valid_to: discount?.valid_to ?? "",
  is_active: discount ? Boolean(discount.is_active) : true,
});

/**
 * Dialog to add or edit a discount.
 *
 *   <EditDiscountDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     discount={discount}       // null in create mode
 *     mode="edit"               // "edit" | "create"
 *     onSubmit={(values, discount) => ...}
 *   />
 *
 * `values`: { name, type, value, valid_from, valid_to, is_active }
 * If `onSubmit` returns a promise the dialog closes when it resolves and
 * stays open when it rejects.
 */
function EditDiscountDialog({
  open,
  onOpenChange,
  discount,
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
    resolver: zodResolver(discountSchema),
    defaultValues: toFormValues(discount),
  });

  const type = useWatch({ control, name: "type" });

  // Load the selected discount into the form each time the dialog opens.
  useEffect(() => {
    if (open) reset(toFormValues(discount));
  }, [open, discount, reset]);

  const submit = async (values) => {
    const payload = {
      name: values.name,
      type: values.type,
      value: Number(values.value),
      valid_from: values.valid_from,
      valid_to: values.valid_to,
      is_active: values.is_active,
    };

    try {
      await onSubmit?.(payload, discount);
      onOpenChange?.(false);
    } catch {
      // Keep the dialog open; the caller is responsible for showing the error.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg!">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Add discount" : "Edit discount"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Enter the details of the new discount."
              : `Update the details for ${discount?.name || "this discount"}.`}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={handleSubmit(submit)}
          className="flex flex-col gap-4"
        >
          <Field
            label="Discount name"
            htmlFor="edit-discount-name"
            required
            error={errors.name?.message}
          >
            <Input
              id="edit-discount-name"
              placeholder="e.g. Student discount"
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="edit-discount-type" required>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    items={TYPE_ITEMS}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="edit-discount-type" className="w-full">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_ITEMS.map((item) => (
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
              label={type === "percentage" ? "Value (%)" : "Value (₹)"}
              htmlFor="edit-discount-value"
              required
              error={errors.value?.message}
            >
              <Input
                id="edit-discount-value"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder={type === "percentage" ? "e.g. 10" : "e.g. 500"}
                aria-required="true"
                aria-invalid={Boolean(errors.value)}
                {...register("value")}
              />
            </Field>

            <Field
              label="Valid from"
              htmlFor="edit-discount-valid-from"
              required
              error={errors.valid_from?.message}
            >
              <Controller
                name="valid_from"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    id="edit-discount-valid-from"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select start date"
                    aria-required="true"
                    aria-invalid={Boolean(errors.valid_from)}
                  />
                )}
              />
            </Field>

            <Field
              label="Valid to"
              htmlFor="edit-discount-valid-to"
              required
              error={errors.valid_to?.message}
            >
              <Controller
                name="valid_to"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    id="edit-discount-valid-to"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select end date"
                    aria-required="true"
                    aria-invalid={Boolean(errors.valid_to)}
                  />
                )}
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
                    {field.value ? "Active discount" : "Inactive discount"}
                  </span>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Discount status"
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
                  ? "Create discount"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditDiscountDialog;
