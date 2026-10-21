import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaymentStatusBadge from "@/components/additonal/SummaryBill/PaymentStatusBadge";
import {
  EMPTY,
  formatDate,
  getInitials,
} from "@/components/additonal/SummaryBill/billHelpers";
import { formatMoney } from "@/utils/currency";

const DATE_TIME = "d MMM yyyy, h:mm a";

// One line of a details list: the label on the left, its value on the right.
function Row({ label, children, tone = "", strong = false }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-1.5 text-sm ${
        strong ? "border-t pt-2 font-semibold" : ""
      }`}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right font-medium ${tone}`}>{children}</dd>
    </div>
  );
}

export function Section({ title, children, className = "" }) {
  return (
    <section className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

// Total, paid so far and what is still owed.
export function AmountTiles({ total, paid, balance }) {
  const tiles = [
    { label: "Bill total", value: total },
    { label: "Paid so far", value: paid },
    { label: "Balance due", value: balance, tone: "text-destructive" },
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map(({ label, value, tone = "" }) => (
        <div key={label} className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>
            {formatMoney(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MemberPanel({ member }) {
  if (!member) {
    return (
      <p className="text-sm text-muted-foreground">
        Member details are not available.
      </p>
    );
  }

  const name = [member.first_name, member.last_name].filter(Boolean).join(" ");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 pb-1">
        <Avatar size="lg">
          {member.avatar_url && <AvatarImage src={member.avatar_url} alt="" />}

          <AvatarFallback>
            {getInitials(member.first_name, member.last_name)}
          </AvatarFallback>
        </Avatar>

        <div className="leading-tight">
          <p className="font-medium">{name || EMPTY}</p>
          <p className="text-xs text-muted-foreground">
            {member.member_Id || EMPTY}
          </p>
        </div>
      </div>

      <dl className="divide-y">
        <Row label="Phone">{member.phone || EMPTY}</Row>
        <Row label="Email">{member.email || EMPTY}</Row>
        <Row label="Joined on">{formatDate(member.joined_on)}</Row>
        <Row label="Trainer">{member.trainer_name || EMPTY}</Row>
      </dl>
    </div>
  );
}

export function BillPanel({ summary, items, payment, issuedBy }) {
  const hasDiscount = Number(summary.discount_price) > 0;

  return (
    <div className="space-y-3">
      <dl className="divide-y">
        <Row label="Bill no">{summary.bill_no}</Row>
        <Row label="Bill date">{formatDate(summary.bill_date)}</Row>
        <Row label="Subscription no">{summary.subscription_no || EMPTY}</Row>
        <Row label="Period">
          {formatDate(summary.start_date)} - {formatDate(summary.end_date)}
        </Row>
        <Row label="Issued by">{issuedBy || EMPTY}</Row>
        <Row label="Payment status">
          <PaymentStatusBadge status={payment.status} />
        </Row>
      </dl>

      {items.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-4 px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {item.item_name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {formatDate(item.start_date)} - {formatDate(item.end_date)}
                </span>
              </span>

              <span className="font-medium tabular-nums">
                {formatMoney(item.total_price)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl>
        <Row label="Price">{formatMoney(summary.base_price)}</Row>
        {hasDiscount && (
          <Row label="Discount">- {formatMoney(summary.discount_price)}</Row>
        )}
        <Row label={`Tax (${Number(summary.tax_percent)}%)`}>
          {formatMoney(summary.tax_amount)}
        </Row>
        <Row label="Total" strong>
          {formatMoney(summary.total_price)}
        </Row>
      </dl>
    </div>
  );
}

// Every payment received so far, with the total paid under it.
export function TransactionsTable({ transactions, paid, balance }) {
  if (!transactions.length) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        No payments have been recorded for this bill.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Received by</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="text-right">Change</TableHead>
          <TableHead className="text-right">Received</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>{formatDate(transaction.paid_on, DATE_TIME)}</TableCell>
            <TableCell>{transaction.method || EMPTY}</TableCell>
            <TableCell>{transaction.received_by || EMPTY}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(transaction.paid_minor)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(transaction.change_minor)}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatMoney(transaction.received_minor)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>

      <TableFooter>
        <TableRow>
          <TableCell colSpan={5}>Total paid</TableCell>
          <TableCell className="text-right tabular-nums">
            {formatMoney(paid)}
          </TableCell>
        </TableRow>

        <TableRow>
          <TableCell colSpan={5}>Balance due</TableCell>
          <TableCell className="text-right text-destructive tabular-nums">
            {formatMoney(balance)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
