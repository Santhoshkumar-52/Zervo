import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Field from "@/components/additonal/Field";

import DatePicker from "@/components/additonal/DatePicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useStaffStore } from "@/store/staff";

const NO_TRAINER = "none";

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
  joined_on: z.string().min(1, "Joined date is required"),
  assigned_trainer_id: z.string(),
  is_active: z.boolean(),
});

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

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
  joined_on: member?.joined_on ?? today(),
  assigned_trainer_id: member?.assigned_trainer_id
    ? String(member.assigned_trainer_id)
    : NO_TRAINER,
  is_active: member ? Boolean(member.is_active) : true,
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
 *   { first_name, last_name, phone, email | null, joined_on,
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

  // Assigned-staff options come from the staff store.
  const staff = useStaffStore((state) => state.staff);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(memberSchema),
    defaultValues: toFormValues(member),
  });

  // Load the selected member into the form each time the dialog opens.
  useEffect(() => {
    if (open) reset(toFormValues(member));
  }, [open, member, reset]);

  const trainerItems = useMemo(() => {
    const items = staff
      .filter((person) => person.role === "trainer" && person.is_active)
      .map((person) => ({
        value: String(person.id),
        label: person.full_name,
      }));

    // The store only holds the staff page that was loaded, so make sure the
    // member's current trainer is always selectable.
    const currentId = member?.assigned_trainer_id;
    if (currentId && !items.some((item) => item.value === String(currentId))) {
      items.push({
        value: String(currentId),
        label: member.trainer_name ?? `Staff #${currentId}`,
      });
    }

    return [{ value: NO_TRAINER, label: "Unassigned" }, ...items];
  }, [staff, member]);

  const submit = async (values) => {
    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone,
      email: values.email || null,
      joined_on: values.joined_on,
      assigned_trainer_id:
        values.assigned_trainer_id === NO_TRAINER
          ? null
          : Number(values.assigned_trainer_id),
      is_active: values.is_active,
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
          {/* Avatar: changing the photo is disabled for now */}
          {!isCreate && (
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarImage
                src={member?.photo_url ?? undefined}
                alt={fullName}
              />
              <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-start gap-1">
              <Button type="button" variant="outline" size="sm" disabled>
                Change photo
              </Button>
              <span className="text-xs text-muted-foreground">
                Photo upload is coming soon.
              </span>
            </div>
          </div>
          )}

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

            <Field
              label="Joined on"
              htmlFor="edit-member-joined-on"
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
                name="assigned_trainer_id"
                control={control}
                render={({ field }) => (
                  <Select
                    items={trainerItems}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="edit-member-trainer" className="w-full">
                      <SelectValue placeholder="Select a trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainerItems.map((item) => (
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
              disabled={isLoading || isMemberLoading || (!isCreate && !isDirty)}
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
