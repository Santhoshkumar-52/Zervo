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

const taxSchema = z.object({
  name: z.string().trim().min(1, "Tax name is required").max(100),
  // Kept as text in the form, converted to a number on submit.
  rate: z
    .string()
    .trim()
    .min(1, "Rate is required")
    .refine((value) => !Number.isNaN(Number(value)), "Enter a valid number")
    .refine(
      (value) => Number(value) >= 0 && Number(value) <= 100,
      "Rate must be between 0 and 100",
    ),
  description: z.string().trim().max(255),
  is_active: z.boolean(),
});

// With no tax (create mode) the form starts empty and active.
const toFormValues = (tax) => ({
  name: tax?.name ?? "",
  rate: tax?.rate !== undefined ? String(tax.rate) : "",
  description: tax?.description ?? "",
  is_active: tax ? Boolean(tax.is_active) : true,
});

/**
 * Dialog to add or edit a tax.
 *
 *   <EditTaxDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     tax={tax}                 // null in create mode
 *     mode="edit"               // "edit" | "create"
 *     onSubmit={(values, tax) => ...}   // values: { name, rate, description, is_active }
 *   />
 *
 * If `onSubmit` returns a promise the dialog closes when it resolves and
 * stays open when it rejects.
 */
function EditTaxDialog({
  open,
  onOpenChange,
  tax,
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
    resolver: zodResolver(taxSchema),
    defaultValues: toFormValues(tax),
  });

  // Load the selected tax into the form each time the dialog opens.
  useEffect(() => {
    if (open) reset(toFormValues(tax));
  }, [open, tax, reset]);

  const submit = async (values) => {
    const payload = {
      name: values.name,
      rate: Number(values.rate),
      description: values.description,
      is_active: values.is_active,
    };

    try {
      await onSubmit?.(payload, tax);
      onOpenChange?.(false);
    } catch {
      // Keep the dialog open; the caller is responsible for showing the error.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg!">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Add tax" : "Edit tax"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Enter the details of the new tax."
              : `Update the details for ${tax?.name || "this tax"}.`}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={handleSubmit(submit)}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Tax name"
              htmlFor="edit-tax-name"
              required
              error={errors.name?.message}
            >
              <Input
                id="edit-tax-name"
                placeholder="e.g. GST"
                aria-required="true"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </Field>

            <Field
              label="Rate (%)"
              htmlFor="edit-tax-rate"
              required
              error={errors.rate?.message}
            >
              <Input
                id="edit-tax-rate"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="e.g. 18"
                aria-required="true"
                aria-invalid={Boolean(errors.rate)}
                {...register("rate")}
              />
            </Field>
          </div>

          <Field
            label="Description"
            htmlFor="edit-tax-description"
            error={errors.description?.message}
          >
            <Input
              id="edit-tax-description"
              placeholder="Optional note about this tax"
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
                    {field.value ? "Active tax" : "Inactive tax"}
                  </span>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Tax status"
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
                  ? "Create tax"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditTaxDialog;
