import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import Field from "@/components/additonal/Field";
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

const ROLE_ITEMS = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "front_desk", label: "Front Desk" },
  { value: "trainer", label: "Trainer" },
];

const DEFAULT_ROLE = "front_desk";

const baseFields = {
  full_name: z.string().trim().min(1, "Full name is required").max(100),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(150)
    .pipe(z.email("Enter a valid email")),
  role: z.string().min(1, "Role is required"),
  is_active: z.boolean(),
};

// Create: staff ID and a password are required.
const createSchema = z.object({
  ...baseFields,
  user_id: z.string().trim().min(1, "Staff ID is required").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});

// Edit: the staff ID is fixed; a blank password keeps the current one.
const editSchema = z.object({
  ...baseFields,
  user_id: z.string(),
  password: z
    .string()
    .max(100)
    .refine((value) => value === "" || value.length >= 8, {
      message: "Password must be at least 8 characters",
    }),
});

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

// With no staff member (create mode) the form starts empty and active.
const toFormValues = (staff) => ({
  user_id: staff?.user_id ?? "",
  full_name: staff?.full_name ?? "",
  email: staff?.email ?? "",
  password: "",
  role: staff?.role ?? DEFAULT_ROLE,
  is_active: staff ? Boolean(staff.is_active) : true,
});

/**
 * Dialog to add or edit a staff member.
 *
 *   <EditStaffDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     staff={staff}                  // a row from the staff list (null to create)
 *     isLoading={isSaving}
 *     isStaffLoading={isSelectedLoading}  // disables Save while the row refreshes
 *     onSubmit={(values, staff) => updateStaff(staff.id, values)}
 *   />
 *
 * `onSubmit` gets the API-ready values:
 *   create: { user_id, full_name, email, password, role, is_active }
 *   edit:   { full_name, email, role, is_active, password? }
 * If it returns a promise the dialog closes when it resolves and stays open
 * when it rejects.
 */
function EditStaffDialog({
  open,
  onOpenChange,
  staff,
  onSubmit,
  isLoading = false,
  isStaffLoading = false,
  mode = "edit", // "edit" | "create" (create: pass staff={null})
}) {
  const isCreate = mode === "create";

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(isCreate ? createSchema : editSchema),
    defaultValues: toFormValues(staff),
  });

  // Load the selected staff member into the form each time the dialog opens.
  useEffect(() => {
    if (open) reset(toFormValues(staff));
  }, [open, staff, reset]);

  // Keep the current role selectable even if it is not in the list.
  const roleItems = useMemo(() => {
    if (!staff?.role || ROLE_ITEMS.some((item) => item.value === staff.role)) {
      return ROLE_ITEMS;
    }

    return [...ROLE_ITEMS, { value: staff.role, label: staff.role }];
  }, [staff]);

  const submit = async (values) => {
    const payload = {
      full_name: values.full_name,
      email: values.email,
      role: values.role,
      is_active: values.is_active,
    };

    if (isCreate) {
      payload.user_id = values.user_id;
      payload.password = values.password;
    } else if (values.password) {
      payload.password = values.password;
    }

    try {
      await onSubmit?.(payload, staff);
      onOpenChange?.(false);
    } catch {
      // Keep the dialog open; the store already showed the error.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg!">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? "Add staff member" : "Edit staff member"}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Enter the details of the new staff member."
              : `Update the details for ${staff?.full_name || "this staff member"}.`}
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
                  src={staff?.avatar_url ?? undefined}
                  alt={staff?.full_name}
                />
                <AvatarFallback>{getInitials(staff?.full_name)}</AvatarFallback>
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
              label="Staff ID"
              htmlFor="edit-staff-user-id"
              required={isCreate}
              error={errors.user_id?.message}
            >
              <Input
                id="edit-staff-user-id"
                readOnly={!isCreate}
                disabled={!isCreate}
                aria-required={isCreate}
                aria-invalid={Boolean(errors.user_id)}
                {...register("user_id")}
              />
            </Field>

            <Field
              label="Full name"
              htmlFor="edit-staff-full-name"
              required
              error={errors.full_name?.message}
            >
              <Input
                id="edit-staff-full-name"
                aria-required="true"
                aria-invalid={Boolean(errors.full_name)}
                {...register("full_name")}
              />
            </Field>

            <Field
              label="Email"
              htmlFor="edit-staff-email"
              required
              error={errors.email?.message}
            >
              <Input
                id="edit-staff-email"
                type="email"
                aria-required="true"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </Field>

            <Field
              label="Role"
              htmlFor="edit-staff-role"
              required
              error={errors.role?.message}
            >
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    items={roleItems}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="edit-staff-role" className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleItems.map((item) => (
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
            label={isCreate ? "Password" : "New password"}
            htmlFor="edit-staff-password"
            required={isCreate}
            error={errors.password?.message}
          >
            <Input
              id="edit-staff-password"
              type="password"
              autoComplete="new-password"
              placeholder={isCreate ? undefined : "Leave blank to keep current"}
              aria-required={isCreate}
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
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
                    {field.value ? "Active staff member" : "Inactive staff member"}
                  </span>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Staff status"
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
              disabled={isLoading || isStaffLoading || (!isCreate && !isDirty)}
            >
              {isLoading
                ? isCreate
                  ? "Creating..."
                  : "Saving..."
                : isCreate
                  ? "Create staff"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditStaffDialog;
