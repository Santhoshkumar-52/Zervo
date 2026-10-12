import { Eye } from "lucide-react";

import PaymentStatusBadge from "@/components/additonal/SummaryBill/PaymentStatusBadge";
import { formatDate } from "@/components/additonal/SummaryBill/billHelpers";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/utils/currency";

const EMPTY = "\u2014";

// Handlers: { onView(bill) }
export const getSubscriptionReportColumns = ({ onView } = {}) => [
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
    accessorKey: "item_count",
    header: "Items",
  },
  {
    accessorKey: "total_minor",
    header: "Total",
    cell: ({ row }) => formatMoney(row.original.total_minor),
  },
  {
    id: "payment_method",
    header: "Method",
    cell: ({ row }) => row.original.payment.method || EMPTY,
  },
  {
    id: "payment_status",
    header: "Status",
    cell: ({ row }) => (
      <PaymentStatusBadge status={row.original.payment.status} />
    ),
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