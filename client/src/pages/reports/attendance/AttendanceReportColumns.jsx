import { format } from "date-fns";

import { formatDate } from "@/components/additonal/SummaryBill/billHelpers";

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
const getCheckoutType = (systemCheckout) => {
  if (systemCheckout === null || systemCheckout === undefined) return EMPTY;

  return systemCheckout ? "Automatic" : "Manual";
};

export const getAttendanceReportColumns = () => [
  {
    accessorKey: "attendance_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.attendance_date),
  },
  {
    id: "member",
    header: "Member",
    cell: ({ row }) => (
      <div className="flex flex-col leading-tight">
        <span>{row.original.member.name || EMPTY}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.member.member_id || EMPTY}
        </span>
      </div>
    ),
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
