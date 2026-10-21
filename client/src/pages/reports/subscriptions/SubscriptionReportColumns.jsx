import { Eye } from "lucide-react";

import PaymentStatusBadge from "@/components/additonal/SummaryBill/PaymentStatusBadge";
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

// Same pill shape as PaymentStatusBadge: red while a balance is owed, green
// once it is clear. The dot and the wording mean colour is never the only
// signal.
const BALANCE_TONES = {
  due: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  clear: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
};

function BalanceStatusBadge({ payment = {} }) {
  const isDue = payment.balance_status === "due";

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium [print-color-adjust:exact] ${
        isDue ? BALANCE_TONES.due : BALANCE_TONES.clear
      }`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {isDue ? `Due ${formatMoney(payment.balance)}` : "Clear"}
    </span>
  );
}

// Handlers: { onView(bill), onViewProfile(memberId) }
// onViewProfile is called when the member name is clicked.
export const getSubscriptionReportColumns = ({
  onView,
  onViewProfile,
} = {}) => [
  {
    accessorKey: "bill_no",
    header: "Bill no",
  },
  {
    accessorKey: "bill_date",
    header: "Bill date",
    cell: ({ row }) => formatDate(row.original.bill_date),
  },
  {
    id: "payment_status",
    header: "Payment status",
    cell: ({ row }) => (
      <PaymentStatusBadge status={row.original.payment.status} />
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
    accessorKey: "item_count",
    header: "Items",
  },
  {
    accessorKey: "total_minor",
    header: "Total",
    cell: ({ row }) => formatMoney(row.original.total_minor),
  },
  {
    id: "balance_status",
    header: "Balance status",
    cell: ({ row }) => <BalanceStatusBadge payment={row.original.payment} />,
  },
  {
    id: "payment_method",
    header: "Method",
    cell: ({ row }) => row.original.payment.method || EMPTY,
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
        onClick={() => onView?.(row.original)}
      >
        <Eye />
      </Button>
    ),
  },
];