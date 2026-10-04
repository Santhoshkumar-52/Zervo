import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import StaffActions from "./StaffActions";

// const ROLE_LABELS = {
//   owner: "Owner",
//   manager: "Manager",
//   front_desk: "Front Desk",
//   trainer: "Trainer",
// };

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

// Handlers: { onEdit, onDelete, onToggleStatus, isStatusUpdating(staff) }
export const getStaffColumns = ({
  onEdit,
  onDelete,
  onToggleStatus,
  isStatusUpdating,
} = {}) => [
  {
    accessorKey: "user_id",
    header: "Staff ID",
  },
  {
    accessorKey: "full_name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar size="sm">
          <AvatarImage
            src={row.original.avatar_url ?? undefined}
            alt={row.original.full_name}
          />
          <AvatarFallback>{getInitials(row.original.full_name)}</AvatarFallback>
        </Avatar>
        <span>{row.original.full_name}</span>
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email || "—",
  },
  {
    accessorKey: "group_name",
    header: "Group",
    cell: ({ row }) => row.original.group_name || "—",
  },
  {
    accessorKey: "branch_name",
    header: "Branch",
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const active = Boolean(row.original.is_active);

      return (
        <Badge variant={active ? "success" : "destructive"}>
          {active ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => (
      <StaffActions
        staff={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
        isStatusUpdating={isStatusUpdating?.(row.original) ?? false}
      />
    ),
  },
];
