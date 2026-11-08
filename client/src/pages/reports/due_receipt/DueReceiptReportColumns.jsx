import { Eye } from "lucide-react";

import { formatDate } from "@/components/additonal/SummaryBill/billHelpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/utils/currency";

const EMPTY = "\u2014";

// "Ravi Kumar" -> "RK"
const getInitials = (name) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

// Same pill shape as PaymentStatusBadge: red while a balance is still owed
// after the payment, green once it is clear. The dot and the wording mean
// colour is never the only signal.
const BALANCE_TONES = {
  due: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  clear: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
};

function BalanceAfterBadge({ balanceMinor }) {
  const isDue = Number(balanceMinor) > 0;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium [print-color-adjust:exact] ${
        isDue ? BALANCE_TONES.due : BALANCE_TONES.clear
      }`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {isDue ? `Due ${formatMoney(balanceMinor)}` : "Clear"}
    </span>
  );
}

// Handlers: { onView(payment), onViewProfile(memberId) }
// onView is called when the bill no is clicked or the eye button is pressed,
// onViewProfile when the member name is clicked.
export const getDueReceiptReportColumns = ({
  onView,
  onViewProfile,
} = {}) => [
  {
    accessorKey: "receipt_no",
    header: "Receipt",
    cell: ({ row }) => (
      <span className="tabular-nums">{`#${row.original.receipt_no}`}</span>
    ),
  },
  {
    accessorKey: "paid_on",
    header: "Received on",
    cell: ({ row }) => formatDate(row.original.paid_on),
  },
  {
    accessorKey: "bill_no",
    header: "Bill no",
    cell: ({ row }) =>
      onView ? (
        <button
          type="button"
          onClick={() => onView(row.original)}
          aria-label={`Open bill ${row.original.bill_no}`}
          className="cursor-pointer rounded-sm font-medium tabular-nums hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {row.original.bill_no}
        </button>
      ) : (
        row.original.bill_no
      ),
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
    accessorKey: "due_before_minor",
    header: "Due before",
    cell: ({ row }) => formatMoney(row.original.due_before_minor),
  },
  {
    accessorKey: "paid_minor",
    header: "Received",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatMoney(row.original.paid_minor)}
      </span>
    ),
  },
  {
    id: "balance_after",
    header: "Balance after",
    cell: ({ row }) => (
      <BalanceAfterBadge balanceMinor={row.original.balance_minor} />
    ),
  },
  {
    id: "payment_method",
    header: "Method",
    cell: ({ row }) => row.original.method || EMPTY,
  },
  {
    id: "received_by",
    header: "Received by",
    cell: ({ row }) => row.original.received_by || EMPTY,
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        aria-label={`View bill ${row.original.bill_no}`}
        disabled={!onView}
        onClick={() => onView?.(row.original)}
      >
        <Eye />
      </Button>
    ),
  },
];
