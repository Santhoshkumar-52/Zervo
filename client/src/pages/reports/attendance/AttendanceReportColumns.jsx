import { format } from "date-fns";

import { formatDate } from "@/components/additonal/SummaryBill/billHelpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const EMPTY = "\u2014";
const TIME_FORMAT = "hh:mm a";

// Check-in / check-out times arrive as ISO strings or Date values.
const formatTime = (value) => {
  if (!value) return EMPTY;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? EMPTY : format(date, TIME_FORMAT);
};

// 95 -> "1h 35m", 40 -> "40m". null means the member has not checked out yet.
const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return EMPTY;
  if (minutes < 0) return EMPTY;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest}m`;

  return `${hours}h ${rest}m`;
};

// true = automatic checkout, false = manual checkout, null = not checked out.
// "Ravi Kumar" -> "RK"
const getInitials = (name) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

const getCheckoutType = (systemCheckout) => {
  if (systemCheckout === null || systemCheckout === undefined) return EMPTY;

  return systemCheckout ? "Automatic" : "Manual";
};

// onViewProfile(memberId) is called when the member name is clicked.
export const getAttendanceReportColumns = ({ onViewProfile } = {}) => [
  {
    accessorKey: "attendance_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.attendance_date),
  },
  {
    id: "member",
    header: "Member",
    cell: ({ row }) => {
      const { member } = row.original;

      return (
        <div className="flex items-center gap-2.5">
          <Avatar>
            {member.avatar_url && (
              <AvatarImage src={member.avatar_url} alt="" />
            )}

            <AvatarFallback className="text-xs">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col items-start leading-tight">
            {member.name && onViewProfile ? (
              <button
                type="button"
                onClick={() => onViewProfile(member.id)}
                aria-label={`View profile of ${member.name}`}
                className="cursor-pointer rounded-sm text-left font-medium hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {member.name}
              </button>
            ) : (
              <span>{member.name || EMPTY}</span>
            )}

            <span className="text-xs text-muted-foreground">
              {member.member_id || EMPTY}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    id: "phone",
    header: "Phone",
    cell: ({ row }) => row.original.member.phone || EMPTY,
  },
  {
    accessorKey: "checkin_at",
    header: "Check-in",
    cell: ({ row }) => formatTime(row.original.checkin_at),
  },
  {
    accessorKey: "checkout_at",
    header: "Check-out",
    cell: ({ row }) => formatTime(row.original.checkout_at),
  },
  {
    accessorKey: "duration_minutes",
    header: "Duration",
    cell: ({ row }) => formatDuration(row.original.duration_minutes),
  },
  {
    accessorKey: "system_checkout",
    header: "Checkout type",
    cell: ({ row }) => getCheckoutType(row.original.system_checkout),
  },
];
