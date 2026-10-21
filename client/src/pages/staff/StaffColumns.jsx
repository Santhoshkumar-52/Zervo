import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import AssociatedMembers from "./AssociatedMembers";
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

// Handlers: { onEdit, onDelete, onToggleStatus, isStatusUpdating(staff),
//             onViewProfile(staffId), onViewMembers(staff),
//             onViewMember(memberId) }
// onViewProfile is called when the staff name is clicked, onViewMembers when
// the "+N" circle of the associated members is clicked, onViewMember when one
// of their avatars is clicked.
export const getStaffColumns = ({
  onEdit,
  onDelete,
  onToggleStatus,
  isStatusUpdating,
  onViewProfile,
  onViewMembers,
  onViewMember,
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
        {row.original.full_name && onViewProfile ? (
          <button
            type="button"
            onClick={() => onViewProfile(row.original.id)}
            aria-label={`View profile of ${row.original.full_name}`}
            className="cursor-pointer rounded-sm text-left font-medium hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {row.original.full_name}
          </button>
        ) : (
          <span>{row.original.full_name}</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email || "—",
  },
  {
    accessorKey: "phone",
    header: "Mobile",
    cell: ({ row }) => row.original.phone || "—",
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
    id: "associated_members",
    header: "Assigned members",
    enableSorting: false,
    cell: ({ row }) => (
      <AssociatedMembers
        associated={row.original.associated_members}
        onViewMember={onViewMember}
        onViewAll={() => onViewMembers?.(row.original)}
      />
    ),
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
