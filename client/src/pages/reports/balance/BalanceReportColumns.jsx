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

// Handlers: { onView(bill), onViewProfile(memberId), onPay(bill) }
// onView is called when the bill no is clicked, onViewProfile when the member
// name is clicked, onPay by the Pay button (the button stays disabled until a
// handler is given).
export const getBalanceReportColumns = ({
  onView,
  onViewProfile,
  onPay,
} = {}) => [
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
    accessorKey: "bill_date",
    header: "Bill date",
    cell: ({ row }) => formatDate(row.original.bill_date),
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
    accessorKey: "paid_minor",
    header: "Paid",
    cell: ({ row }) => formatMoney(row.original.paid_minor),
  },
  {
    accessorKey: "balance_minor",
    header: "Balance due",
    cell: ({ row }) => (
      <span className="font-medium text-destructive tabular-nums">
        {formatMoney(row.original.balance_minor)}
      </span>
    ),
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
        variant="outline"
        size="sm"
        aria-label={`Pay balance of bill ${row.original.bill_no}`}
        disabled={!onPay}
        onClick={() => onPay?.(row.original)}
      >
        Pay
      </Button>
    ),
  },
];
