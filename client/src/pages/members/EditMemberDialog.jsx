import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AsyncCombobox from "@/components/additonal/AsyncCombobox";
import AvatarUploader from "@/components/additonal/AvatarUploader";
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

import { trainerSource } from "./trainerSource";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "others", label: "Others" },
];

const memberSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().max(100),
  phone: z
    .string()
    .trim()
    .min(8, "Phone is required")
    .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number"),
  // Optional: empty is allowed, otherwise it must be a valid email.
  email: z
    .string()
    .trim()
    .max(255)
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Enter a valid email",
    }),
  // Optional: null until one is chosen.
  gender: z.enum(["male", "female", "others"]).nullable(),
  joined_on: z.string().min(1, "Joined date is required"),
  // The chosen trainer, or null when unassigned. Only the id and name are kept.
  assigned_trainer: z
    .object({ id: z.number(), full_name: z.string() })
    .nullable(),
  is_active: z.boolean(),
  // Cloudinary URL of the photo, or null.
  avatar_url: z.string().nullable(),
});

// Today as YYYY-MM-DD in the user's local time (default joined date).
const today = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
};

// With no member (create mode) the form starts empty, dated today, and active.
const toFormValues = (member) => ({
  first_name: member?.first_name ?? "",
  last_name: member?.last_name ?? "",
  phone: member?.phone ?? "",
  email: member?.email ?? "",
  gender: member?.gender ?? null,
  joined_on: member?.joined_on ?? today(),
  assigned_trainer: member?.assigned_trainer_id
    ? {
        id: member.assigned_trainer_id,
        full_name:
          member.trainer_name ?? `Staff #${member.assigned_trainer_id}`,
      }
    : null,
  is_active: member ? Boolean(member.is_active) : true,
  avatar_url: member?.avatar_url ?? null,
});

// Label + control + error message.

/**
 * Dialog to edit a member record.
 *
 *   <EditMemberDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     member={member}               // a row from the members list
 *     isLoading={updateMutation.isPending}
 *     isMemberLoading={isFetchingMember}  // disables Save while the member loads
 *     onSubmit={(values) => updateMutation.mutateAsync({ id, values })}
 *   />
 *
 * `onSubmit` gets the API-ready values:
 *   { first_name, last_name, phone, email | null, gender | null, joined_on,
 *     assigned_trainer_id | null, is_active }
 * If it returns a promise the dialog closes when it resolves and stays open
 * when it rejects.
 */
function EditMemberDialog({
  open,
  onOpenChange,
  member,
  onSubmit,
  isLoading = false,
  isMemberLoading = false,
  mode = "edit", // "edit" | "create" (create: pass member={null})
}) {
  const isCreate = mode === "create";

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(memberSchema),
    defaultValues: toFormValues(member),
  });

  // The uploaded photo URL, and whether a photo upload is still running.
  const avatarUrl = watch("avatar_url");
  const [isUploading, setIsUploading] = useState(false);

  // Load the selected member into the form each time the dialog opens.
  useEffect(() => {
    if (open) reset(toFormValues(member));
  }, [open, member, reset]);

  const submit = async (values) => {
    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone,
      email: values.email || null,
      gender: values.gender ?? null,
      joined_on: values.joined_on,
      assigned_trainer_id: values.assigned_trainer?.id ?? null,

      is_active: values.is_active,
      avatar_url: values.avatar_url || null,
    };

    try {
      await onSubmit?.(payload, member);
      onOpenChange?.(false);
    } catch {
      // Keep the dialog open; the caller is responsible for showing the error.
    }
  };

  const fullName = [member?.first_name, member?.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg!">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Add member" : "Edit member"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Enter the details of the new member."
              : `Update the details for ${fullName || "this member"}.`}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={handleSubmit(submit)}
          className="flex flex-col gap-4"
        >
          {/* Photo: uploaded to Cloudinary, saved with the form */}
          <AvatarUploader
            value={avatarUrl}
            name={[watch("first_name"), watch("last_name")].filter(Boolean).join(" ")}
            disabled={isLoading}
            onUploadingChange={setIsUploading}
            onChange={(url) =>
              setValue("avatar_url", url, { shouldDirty: true })
            }
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              htmlFor="edit-member-first-name"
              required
              error={errors.first_name?.message}
            >
              <Input
                id="edit-member-first-name"
                aria-required="true"
                aria-invalid={Boolean(errors.first_name)}
                {...register("first_name")}
              />
            </Field>

            <Field
              label="Last name"
              htmlFor="edit-member-last-name"
              error={errors.last_name?.message}
            >
              <Input
                id="edit-member-last-name"
                aria-required="true"
                aria-invalid={Boolean(errors.last_name)}
                {...register("last_name")}
              />
            </Field>

            <Field
              label="Phone"
              htmlFor="edit-member-phone"
              required
              error={errors.phone?.message}
            >
              <Input
                id="edit-member-phone"
                type="tel"
                aria-required="true"
                aria-invalid={Boolean(errors.phone)}
                {...register("phone")}
              />
            </Field>

            <Field
              label="Email"
              htmlFor="edit-member-email"
              error={errors.email?.message}
            >
              <Input
                id="edit-member-email"
                type="email"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </Field>

            <Field label="Gender" htmlFor="edit-member-gender">
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    items={GENDER_OPTIONS}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="edit-member-gender" className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              label="Joined on"              htmlFor="edit-member-joined-on"
              required
              error={errors.joined_on?.message}
            >
              <Controller
                name="joined_on"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    id="edit-member-joined-on"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select joined date"
                    aria-required="true"
                    aria-invalid={Boolean(errors.joined_on)}
                  />
                )}
              />
            </Field>

            <Field label="Assigned trainer" htmlFor="edit-member-trainer">
              <Controller
                name="assigned_trainer"
                control={control}
                render={({ field }) => (
                  <AsyncCombobox
                    id="edit-member-trainer"
                    source={trainerSource}
                    value={field.value}
                    onValueChange={(trainer) =>
                      field.onChange(
                        trainer
                          ? { id: trainer.id, full_name: trainer.full_name }
                          : null,
                      )
                    }
                    placeholder="Unassigned"
                    clearable
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
                    {field.value ? "Active member" : "Inactive member"}
                  </span>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Member status"
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
            <Button
              type="submit"
              disabled={
                isLoading || isMemberLoading || isUploading || (!isCreate && !isDirty)
              }
            >
              {isLoading
                ? isCreate
                  ? "Creating..."
                  : "Saving..."
                : isCreate
                  ? "Create member"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditMemberDialog;
