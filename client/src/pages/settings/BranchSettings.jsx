import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { z } from "zod";

import { getBranchList, updateBranch } from "@/api/branch/branchApi";
import Field from "@/components/additonal/Field";
import { BRANCH_SWITCH_GROUP_ID } from "@/components/additonal/BranchFilter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/auth";
import { notifyError, notifySuccess } from "@/utils/notification";

const NO_BRANCHES = [];

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

// ---------------------------------------------------------------------------
// Option lists. The bill / receipt values must match the enu() columns in
// 20261002120000_create_branches_table.js.
// ---------------------------------------------------------------------------

const SUBBILL_OPTIONS = [
  {
    value: "summary-bill",
    label: "Standard",
    description: "The default summary bill.",
  },
  {
    value: "diwali",
    label: "Diwali",
    description: "Festive Diwali theme.",
  },
  {
    value: "pongal",
    label: "Pongal",
    description: "Festive Pongal theme.",
  },
];

const RECEIPT_OPTIONS = [
  {
    value: "receipt-bill",
    label: "Standard",
    description: "The default payment receipt.",
  },
  {
    value: "diwali",
    label: "Diwali",
    description: "Festive Diwali theme.",
  },
  {
    value: "pongal",
    label: "Pongal",
    description: "Festive Pongal theme.",
  },
];

const CURRENCY_OPTIONS = [
  { value: "\u20B9", label: "\u20B9  Indian Rupee" },
  { value: "$", label: "$  US Dollar" },
  { value: "\u20AC", label: "\u20AC  Euro" },
  { value: "\u00A3", label: "\u00A3  British Pound" },
  { value: "AED", label: "AED  UAE Dirham" },
  { value: "SAR", label: "SAR  Saudi Riyal" },
  { value: "SGD", label: "SGD  Singapore Dollar" },
  { value: "MYR", label: "MYR  Malaysian Ringgit" },
  { value: "LKR", label: "LKR  Sri Lankan Rupee" },
];

const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required").max(150),
  code: z.string().trim().min(1, "Branch code is required").max(50),
  address: z.string().trim().max(255, "Address can be at most 255 characters"),
  phone: z
    .string()
    .trim()
    .max(20, "Phone can be at most 20 characters")
    .regex(/^[0-9+\-()\s]*$/, "Use digits, + - ( ) and spaces only"),
  currency: z.string().trim().min(1, "Select a currency").max(20),
  logo: z.string().trim().url("Enter a valid URL").max(2083),
  attend_background: z.string().trim().url("Enter a valid URL").max(2083),
  subbill_url: z.enum(SUBBILL_OPTIONS.map((option) => option.value)),
  receipt_url: z.enum(RECEIPT_OPTIONS.map((option) => option.value)),
  is_active: z.boolean(),
});

const toFormValues = (branch) => ({
  name: branch?.name ?? "",
  code: branch?.code ?? "",
  address: branch?.address ?? "",
  phone: branch?.phone ?? "",
  currency: branch?.currency ?? "\u20B9",
  logo: branch?.logo ?? "",
  attend_background: branch?.attend_background ?? "",
  subbill_url: branch?.subbill_url ?? "summary-bill",
  receipt_url: branch?.receipt_url ?? "receipt-bill",
  is_active: branch ? Boolean(branch.is_active) : true,
});

function Section({ title, description, children }) {
  return (
    <section className="space-y-4">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {children}
    </section>
  );
}

// Small preview next to an image URL input. Remount it (key={src}) when the
// URL changes so a previous load error does not stick.
function ImagePreview({ src, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg border border-dashed text-[10px] text-muted-foreground ${className}`}
      >
        No preview
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-lg border bg-muted object-cover ${className}`}
    />
  );
}

// Card-style radio options: the whole card is clickable.
function OptionRadioGroup({ label, value, onChange, options, disabled }) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className="grid gap-3 sm:grid-cols-3"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
        >
          <RadioGroupItem value={option.value} className="mt-0.5" />

          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{option.label}</span>
            <span className="text-xs text-muted-foreground">
              {option.description}
            </span>
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}

/**
 * Branch settings: a dropdown of every branch (GET /api/branch) and an edit
 * form for the one selected (PATCH /api/branch/:id). Only the owner (group 1)
 * can list or edit branches, so everyone else sees a short notice.
 *
 * Inputs follow the column type:
 *   name, code, phone, logo, background  text / tel / url inputs
 *   address                              textarea
 *   currency                             dropdown
 *   bill page, receipt page (enums)      radio cards
 *   is_active                            switch
 *
 * The dropdown starts on the user's own branch. Switching branch loads that
 * branch into the form (unsaved edits are discarded).
 */
function BranchSettings() {
  const queryClient = useQueryClient();

  const groupId = useAuthStore((state) => state.user?.groupId);
  const userBranchId = useAuthStore((state) => state.user?.branchId);

  const isOwner = Number(groupId) === BRANCH_SWITCH_GROUP_ID;

  // null until the owner picks one; then the dropdown follows the pick.
  const [pickedId, setPickedId] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranchList,
    enabled: isOwner,
  });

  const branches = data?.branches ?? NO_BRANCHES;

  // The select works with string values, branch ids are numbers.
  const items = useMemo(
    () =>
      branches.map((branch) => ({
        value: String(branch.id),
        label: branch.is_active ? branch.name : `${branch.name} (inactive)`,
      })),
    [branches],
  );

  // Own branch first; fall back to the first branch if it is not in the list.
  const selectedId =
    pickedId ??
    (branches.some((branch) => branch.id === userBranchId)
      ? userBranchId
      : (branches[0]?.id ?? null));

  const selected = branches.find((branch) => branch.id === selectedId);
  // The saved currency is always selectable, even if it is not in the list.
  const currencyItems = useMemo(() => {
    const saved = selected?.currency;

    return saved && !CURRENCY_OPTIONS.some((option) => option.value === saved)
      ? [...CURRENCY_OPTIONS, { value: saved, label: saved }]
      : CURRENCY_OPTIONS;
  }, [selected?.currency]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(branchSchema),
    defaultValues: toFormValues(selected),
  });

  // Load the selected branch into the form whenever it changes (a different
  // pick, or fresh data after a save).
  useEffect(() => {
    if (selected) reset(toFormValues(selected));
  }, [selected, reset]);

  const logo = watch("logo");
  const attendBackground = watch("attend_background");

  const mutation = useMutation({
    mutationFn: ({ id, values }) => updateBranch(id, values),
    onSuccess: ({ branch }) => {
      // Replace the saved branch in the cached list (no refetch needed).
      queryClient.setQueryData(["branches"], (old) =>
        old
          ? {
              ...old,
              branches: old.branches
                .map((item) =>
                  item.id === branch.id ? { ...item, ...branch } : item,
                )
                .sort((a, b) => a.name.localeCompare(b.name)),
            }
          : old,
      );

      notifySuccess(`${branch.name} updated`);
    },
    onError: (err) => notifyError(getApiError(err, "Failed to update branch")),
  });

  const onSubmit = (values) => {
    if (!selected) return;

    mutation.mutate({ id: selected.id, values });
  };

  const isSaving = mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-5" />
          Branch
        </CardTitle>

        <CardDescription>
          Pick a branch, then edit its details and bill settings.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isOwner ? (
          <p className="text-sm text-muted-foreground">
            Only the owner can view and edit branches.
          </p>
        ) : (
          <>
            <Field label="Branch" htmlFor="settings-branch">
              <Select
                items={items}
                value={selectedId == null ? "" : String(selectedId)}
                onValueChange={(next) => next && setPickedId(Number(next))}
                disabled={isLoading || isSaving || items.length === 0}
              >
                <SelectTrigger id="settings-branch" className="w-64">
                  <SelectValue
                    placeholder={
                      isLoading ? "Loading branches..." : "Select a branch"
                    }
                  />
                </SelectTrigger>

                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {isError && (
              <p className="text-sm text-destructive" role="alert">
                {getApiError(error, "Failed to load branches")}
              </p>
            )}

            {isLoading && (
              <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            )}

            {selected && (
              <form
                noValidate
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <Separator />

                <Section
                  title="Details"
                  description="Shown on bills and receipts."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Branch name"
                      htmlFor="branch-name"
                      required
                      error={errors.name?.message}
                    >
                      <Input
                        id="branch-name"
                        aria-required="true"
                        aria-invalid={Boolean(errors.name)}
                        {...register("name")}
                      />
                    </Field>

                    <Field
                      label="Branch code"
                      htmlFor="branch-code"
                      required
                      error={errors.code?.message}
                    >
                      <Input
                        id="branch-code"
                        aria-required="true"
                        aria-invalid={Boolean(errors.code)}
                        {...register("code")}
                      />
                    </Field>

                    <Field
                      label="Phone"
                      htmlFor="branch-phone"
                      error={errors.phone?.message}
                    >
                      <Input
                        id="branch-phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="e.g. +91 98765 43210"
                        aria-invalid={Boolean(errors.phone)}
                        {...register("phone")}
                      />
                    </Field>

                    <Field
                      label="Currency"
                      htmlFor="branch-currency"
                      required
                      error={errors.currency?.message}
                    >
                      <Controller
                        name="currency"
                        control={control}
                        render={({ field }) => (
                          <Select
                            items={currencyItems}
                            value={field.value}
                            onValueChange={(next) => next && field.onChange(next)}
                          >
                            <SelectTrigger
                              id="branch-currency"
                              className="w-full"
                              aria-invalid={Boolean(errors.currency)}
                            >
                              <SelectValue placeholder="Select a currency" />
                            </SelectTrigger>

                            <SelectContent>
                              {currencyItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>
                  </div>

                  <Field
                    label="Address"
                    htmlFor="branch-address"
                    error={errors.address?.message}
                  >
                    <Textarea
                      id="branch-address"
                      rows={3}
                      placeholder="Street, area, city"
                      aria-invalid={Boolean(errors.address)}
                      {...register("address")}
                    />
                  </Field>
                </Section>

                <Separator />

                <Section
                  title="Branding"
                  description="Image links used on bills and the attendance screen."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <ImagePreview
                        key={logo}
                        src={logo}
                        className="mt-6 size-10"
                      />

                      <Field
                        className="min-w-0 flex-1"
                        label="Logo URL"
                        htmlFor="branch-logo"
                        required
                        error={errors.logo?.message}
                      >
                        <Input
                          id="branch-logo"
                          type="url"
                          inputMode="url"
                          aria-required="true"
                          aria-invalid={Boolean(errors.logo)}
                          {...register("logo")}
                        />
                      </Field>
                    </div>

                    <div className="flex items-start gap-3">
                      <ImagePreview
                        key={attendBackground}
                        src={attendBackground}
                        className="mt-6 h-10 w-16"
                      />

                      <Field
                        className="min-w-0 flex-1"
                        label="Attendance background URL"
                        htmlFor="branch-attend-background"
                        required
                        error={errors.attend_background?.message}
                      >
                        <Input
                          id="branch-attend-background"
                          type="url"
                          inputMode="url"
                          aria-required="true"
                          aria-invalid={Boolean(errors.attend_background)}
                          {...register("attend_background")}
                        />
                      </Field>
                    </div>
                  </div>
                </Section>

                <Separator />

                <Section
                  title="Bill pages"
                  description="Which page this branch uses for its bills and receipts."
                >
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Summary bill</span>

                    <Controller
                      name="subbill_url"
                      control={control}
                      render={({ field }) => (
                        <OptionRadioGroup
                          label="Summary bill page"
                          value={field.value}
                          onChange={field.onChange}
                          options={SUBBILL_OPTIONS}
                          disabled={isSaving}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-medium">Receipt</span>

                    <Controller
                      name="receipt_url"
                      control={control}
                      render={({ field }) => (
                        <OptionRadioGroup
                          label="Receipt page"
                          value={field.value}
                          onChange={field.onChange}
                          options={RECEIPT_OPTIONS}
                          disabled={isSaving}
                        />
                      )}
                    />
                  </div>
                </Section>

                <Separator />

                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">Status</span>
                        <span className="text-xs text-muted-foreground">
                          {field.value ? "Active branch" : "Inactive branch"}
                        </span>
                      </div>

                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSaving}
                        aria-label="Branch status"
                      />
                    </div>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!isDirty || isSaving}
                    onClick={() => reset(toFormValues(selected))}
                  >
                    Reset
                  </Button>

                  <Button type="submit" disabled={!isDirty || isSaving}>
                    {isSaving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default BranchSettings;
