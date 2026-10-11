import { DISCOUNT_TYPE } from "@/utils/billing";

import { EMPTY, SECTION_PADDING, formatDate, plural } from "./billHelpers";

// Anything other than a plain membership gets a small label (add-on, personal training...).
const itemTypeLabel = (type) =>
  !type || type === "membership"
    ? null
    : type.replace(/[_-]+/g, " ").replace(/^./, (char) => char.toUpperCase());

const periodText = (item) =>
  item.start_date && item.end_date
    ? `${formatDate(item.start_date)} \u2013 ${formatDate(item.end_date)}`
    : null;

const Dash = () => <span className="text-muted-foreground">{EMPTY}</span>;

function ItemName({ item }) {
  const label = itemTypeLabel(item.item_type);
  const dates = periodText(item);

  return (
    <div className="min-w-0">
      <p className="font-medium">{item.item_name}</p>

      {label && (
        <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          {label}
        </span>
      )}

      {item.item_description && (
        <p className="mt-1 text-sm text-muted-foreground">{item.item_description}</p>
      )}

      {dates && <p className="mt-1 text-xs text-muted-foreground">{dates}</p>}
    </div>
  );
}

// discount_rate is only filled for percentage discounts.
function DiscountCell({ item, money }) {
  const amount = Number(item.discount_price) || 0;
  if (!amount) return <Dash />;

  const isPercentage = Number(item.discount_type) === DISCOUNT_TYPE.PERCENTAGE;
  const rate = isPercentage && item.discount_rate != null ? Number(item.discount_rate) : null;

  return (
    <>
      {"\u2212"}
      {money(amount)}
      {rate ? <span className="block text-xs text-muted-foreground">{rate}% off</span> : null}
    </>
  );
}

function TaxCell({ item, money }) {
  const amount = Number(item.tax_amount) || 0;
  const rate = Number(item.tax_percent) || 0;
  if (!amount && !rate) return <Dash />;

  return (
    <>
      {money(amount)}
      <span className="block text-xs text-muted-foreground">{rate}%</span>
    </>
  );
}

// Line items (subs_items). A table from md up, stacked rows on small screens.
// base_price is the line's price before discount and tax.
function BillItems({ items = [], money, className = "" }) {
  return (
    <section
      aria-labelledby="bill-items-title"
      className={`${SECTION_PADDING} ${className}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="bill-items-title" className="text-sm font-semibold">
          Items
        </h3>
        <p className="text-sm text-muted-foreground">{plural(items.length, "item")}</p>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No items on this bill.
        </p>
      ) : (
        <>
          <table className="mt-4 hidden w-full text-sm md:table">
            <caption className="sr-only">Items on this bill with price, discount, tax and total</caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="pr-4 pb-2 font-medium">Item</th>
                <th scope="col" className="px-3 pb-2 text-right font-medium">Qty</th>
                <th scope="col" className="px-3 pb-2 text-right font-medium">Price</th>
                <th scope="col" className="px-3 pb-2 text-right font-medium">Discount</th>
                <th scope="col" className="px-3 pb-2 text-right font-medium">Tax</th>
                <th scope="col" className="pb-2 pl-3 text-right font-medium">Total</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b align-top last:border-b-0">
                  <td className="py-4 pr-4"><ItemName item={item} /></td>
                  <td className="px-3 py-4 text-right tabular-nums">{item.quantity ?? 1}</td>
                  <td className="px-3 py-4 text-right tabular-nums">{money(item.base_price)}</td>
                  <td className="px-3 py-4 text-right tabular-nums"><DiscountCell item={item} money={money} /></td>
                  <td className="px-3 py-4 text-right tabular-nums"><TaxCell item={item} money={money} /></td>
                  <td className="py-4 pl-3 text-right font-semibold tabular-nums">{money(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="mt-4 divide-y md:hidden">
            {items.map((item) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <ItemName item={item} />
                  <p className="shrink-0 font-semibold tabular-nums">{money(item.total_price)}</p>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Qty</dt>
                    <dd className="tabular-nums">{item.quantity ?? 1}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Price</dt>
                    <dd className="tabular-nums">{money(item.base_price)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Discount</dt>
                    <dd className="tabular-nums"><DiscountCell item={item} money={money} /></dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Tax</dt>
                    <dd className="tabular-nums"><TaxCell item={item} money={money} /></dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default BillItems;
