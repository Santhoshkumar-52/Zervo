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

// The select works with text, so the type is "1" / "2" in the form and sent
// to the server as a number. The server saves the type name itself.
const PERCENTAGE = "1";
const FIXED = "2";

const TYPE_ITEMS = [
  { value: PERCENTAGE, label: "Percentage (%)" },
  { value: FIXED, label: "Fixed amount (₹)" },
];

const discountSchema = z
  .object({
    name: z.string().trim().min(1, "Discount name is required").max(100),
    type: z.enum([PERCENTAGE, FIXED]),
    // Kept as text in the form, converted to a number on submit.
    value: z
      .string()
      .trim()
      .min(1, "Value is required")
      .refine((value) => !Number.isNaN(Number(value)), "Enter a valid number")
      .refine((value) => Number(value) > 0, "Value must be greater than 0"),
    description: z.string().trim().max(255),
    // Optional: an empty date is saved as no date.
    starts_on: z.string(),
    ends_on: z.string(),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type === PERCENTAGE && Number(data.value) > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Percentage cannot be more than 100",
      });
    }

    if (data.starts_on && data.ends_on && data.ends_on < data.starts_on) {
      ctx.addIssue({
        code: "custom",
        path: ["ends_on"],
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
// The saved type is read from `type_name`, which the server always sets.
const toFormValues = (discount) => ({
  name: discount?.name ?? "",
  type: discount?.type_name === "fixed" ? FIXED : PERCENTAGE,
  value: discount?.value != null ? String(Number(discount.value)) : "",
  description: discount?.description ?? "",
  starts_on: discount ? (discount.starts_on ?? "") : today(),
  ends_on: discount?.ends_on ?? "",
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
 * `values`: { name, type (1 | 2), value, description, starts_on, ends_on, is_active }
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
      type: Number(values.type),
      value: Number(values.value),
      description: values.description,
      starts_on: values.starts_on || null,
      ends_on: values.ends_on || null,
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
              label={type === PERCENTAGE ? "Value (%)" : "Value (₹)"}
              htmlFor="edit-discount-value"
              required
              error={errors.value?.message}
            >
              <Input
                id="edit-discount-value"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder={type === PERCENTAGE ? "e.g. 10" : "e.g. 500"}
                aria-required="true"
                aria-invalid={Boolean(errors.value)}
                {...register("value")}
              />
            </Field>

            <Field
              label="Valid from"
              htmlFor="edit-discount-starts-on"
              error={errors.starts_on?.message}
            >
              <Controller
                name="starts_on"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    id="edit-discount-starts-on"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select start date"
                    aria-invalid={Boolean(errors.starts_on)}
                  />
                )}
              />
            </Field>

            <Field
              label="Valid to"
              htmlFor="edit-discount-ends-on"
              error={errors.ends_on?.message}
            >
              <Controller
                name="ends_on"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    id="edit-discount-ends-on"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select end date"
                    aria-invalid={Boolean(errors.ends_on)}
                  />
                )}
              />
            </Field>
          </div>

          <Field
            label="Description"
            htmlFor="edit-discount-description"
            error={errors.description?.message}
          >
            <Input
              id="edit-discount-description"
              placeholder="Optional note about this discount"
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
          </Field>

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
