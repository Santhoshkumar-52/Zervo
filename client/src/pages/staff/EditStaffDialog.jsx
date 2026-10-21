import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { getGroups } from "@/api/group/groupApi";
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
import { useAuthStore } from "@/store/auth";

// Built-in groups, shown until the real list loads. `value` is the group id
// (same ids as the groups seed); `name` is only used to hide owner / manager.
const ROLE_ITEMS = [
  { value: 1, name: "owner", label: "Owner" },
  { value: 2, name: "manager", label: "Manager" },
  { value: 3, name: "front_desk", label: "Front Desk" },
  { value: 4, name: "trainer", label: "Trainer" },
];

const DEFAULT_GROUP_ID = 3; // front_desk

// Only a logged-in owner (group 1) can see and pick these roles.
const OWNER_GROUP_ID = 1;
const OWNER_ONLY_ROLES = ["owner", "manager"];

// How long fetched groups are reused before the next open fetches again.
const GROUPS_STALE_MS = 60 * 1000;

// "front_desk" -> "Front Desk". Names that already have capitals or spaces
// are only tidied up, so "Senior Trainer" stays as it is.
const formatGroupLabel = (name = "") =>
  name
    .replace(/_/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "others", label: "Others" },
];

// Mobile number: digits with an optional leading +, spaces, dashes and
// brackets, 7 to 15 digits in total. Same rule as the server.
const phoneField = z
  .string()
  .trim()
  .min(1, "Mobile number is required")
  .regex(/^\+?[0-9\-\s()]{7,20}$/, "Enter a valid mobile number")
  .refine(
    (value) => {
      const digits = value.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    },
    { message: "Mobile number must have 7 to 15 digits" },
  );

const baseFields = {
  full_name: z.string().trim().min(1, "Full name is required").max(100),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(150)
    .pipe(z.email("Enter a valid email")),
  phone: phoneField,
  // The chosen group (role), by id.
  group_id: z
    .number({ message: "Role is required" })
    .int()
    .positive("Role is required"),
  // Optional: null until one is chosen.
  gender: z.enum(["male", "female", "others"]).nullable(),
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
  phone: staff?.phone ?? "",
  password: "",
  group_id: staff?.group_id ?? DEFAULT_GROUP_ID,
  gender: staff?.gender ?? null,
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
 *   create: { user_id, full_name, email, phone, password, group_id, gender | null, is_active }
 *   edit:   { full_name, email, phone, group_id, gender | null, is_active, password? }
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

  const isOwner = useAuthStore((state) => state.user?.groupId) === OWNER_GROUP_ID;

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

  // The groups (roles) are fetched when the role dropdown is clicked open,
  // once per time the dialog opens; the cache keeps them for a minute.
  const [groupsRequested, setGroupsRequested] = useState(false);

  // A freshly opened dialog fetches again on the next click of the dropdown.
  // (State is adjusted while rendering, which React prefers over an effect.)
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) setGroupsRequested(false);
  }

  // Load the selected staff member into the form each time the dialog opens.
  useEffect(() => {
    if (open) reset(toFormValues(staff));
  }, [open, staff, reset]);

  const {
    data: groups,
    isFetching: isGroupsFetching,
    isError: isGroupsError,
  } = useQuery({
    queryKey: ["groups", "options"],
    queryFn: () =>
      getGroups({ groupActive: true, limit: 100 }).then(
        (response) => response.data.data.groups,
      ),
    enabled: open && groupsRequested,
    staleTime: GROUPS_STALE_MS,
  });

  // Fetched groups when we have them, else the built-in roles. The current
  // role stays selectable even if it is not in the list.
  const roleItems = useMemo(() => {
    const allItems = groups
      ? groups.map((group) => ({
          value: group.id,
          name: group.name,
          label: formatGroupLabel(group.name),
        }))
      : ROLE_ITEMS;

    // Owner and manager can only be given by an owner (group 1).
    const items = isOwner
      ? allItems
      : allItems.filter((item) => !OWNER_ONLY_ROLES.includes(item.name));

    if (!staff?.group_id || items.some((item) => item.value === staff.group_id)) {
      return items;
    }

    return [
      ...items,
      {
        value: staff.group_id,
        name: staff.group_name,
        label: formatGroupLabel(staff.group_name ?? `Group #${staff.group_id}`),
      },
    ];
  }, [groups, staff, isOwner]);

  const submit = async (values) => {
    const payload = {
      full_name: values.full_name,
      email: values.email,
      phone: values.phone,
      group_id: values.group_id,
      gender: values.gender ?? null,
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
              label="Mobile"
              htmlFor="edit-staff-phone"
              required
              error={errors.phone?.message}
            >
              <Input
                id="edit-staff-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                placeholder="e.g. 98765 43210"
                aria-required="true"
                aria-invalid={Boolean(errors.phone)}
                {...register("phone")}
              />
            </Field>

            <Field
              label="Role"
              htmlFor="edit-staff-role"
              required
              error={errors.group_id?.message}
            >
              <Controller
                name="group_id"
                control={control}
                render={({ field }) => (
                  <Select
                    items={roleItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    onOpenChange={(isOpen) => {
                      if (isOpen) setGroupsRequested(true);
                    }}
                  >
                    <SelectTrigger id="edit-staff-role" className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {isGroupsFetching && !groups ? (
                        <SelectItem value="__loading" disabled>
                          Loading groups...
                        </SelectItem>
                      ) : (
                        roleItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))
                      )}

                      {isGroupsError && !groups && (
                        <SelectItem value="__error" disabled>
                          Could not load groups
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Gender" htmlFor="edit-staff-gender">
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    items={GENDER_OPTIONS}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="edit-staff-gender" className="w-full">
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
          </div>

          <Field
            label={isCreate ? "Password" : "New password"}            htmlFor="edit-staff-password"
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
