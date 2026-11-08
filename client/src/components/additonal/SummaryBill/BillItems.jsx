import { DISCOUNT_TYPE } from "@/utils/billing";

import { LABEL, PAD } from "./billStyles";
import { EMPTY, formatDate, plural } from "./billHelpers";

// Anything other than a plain membership gets a small label (add-on, personal training...).
const itemTypeLabel = (type) =>
  !type || type === "membership"
    ? null
    : type.replace(/[_-]+/g, " ").replace(/^./, (char) => char.toUpperCase());

const periodText = (item) =>
  item.start_date && item.end_date
    ? `${formatDate(item.start_date)} \u2013 ${formatDate(item.end_date)}`
    : null;

const Dash = () => <span className="text-zinc-500">{EMPTY}</span>;

function ItemName({ item }) {
  const label = itemTypeLabel(item.item_type);
  const dates = periodText(item);

  return (
    <div className="min-w-0">
      <p className="text-base leading-snug font-semibold text-zinc-900">{item.item_name}</p>

      {label && (
        <span className="mt-1 inline-block rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs font-medium text-zinc-700">
          {label}
        </span>
      )}

      {item.item_description && (
        <p className="mt-1 text-sm text-zinc-600">{item.item_description}</p>
      )}

      {dates && <p className="mt-1 text-xs font-medium text-zinc-600">{dates}</p>}
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
      {rate ? <span className="block text-xs text-zinc-600">{rate}% off</span> : null}
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
      <span className="block text-xs text-zinc-600">{rate}%</span>
    </>
  );
}

// Line items (subs_items). A table from md up, stacked rows on phones.
// base_price is the line's price before discount and tax.
function BillItems({ items = [], money, className = "" }) {
  return (
    <section aria-labelledby="bill-items-title" className={`${PAD} ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="bill-items-title" className={LABEL}>
          Items
        </h3>
        <p className="text-sm text-zinc-600">{plural(items.length, "item")}</p>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">No items on this bill.</p>
      ) : (
        <>
          <table className="mt-3 hidden w-full text-sm text-zinc-900 md:table">
            <caption className="sr-only">
              Items on this bill with price, discount, tax and total
            </caption>
            <thead>
              <tr className="border-b-2 border-zinc-900 text-left text-xs tracking-wider text-zinc-600 uppercase">
                <th scope="col" className="pr-4 pb-2 font-semibold">Item</th>
                <th scope="col" className="px-3 pb-2 text-right font-semibold">Qty</th>
                <th scope="col" className="px-3 pb-2 text-right font-semibold">Price</th>
                <th scope="col" className="px-3 pb-2 text-right font-semibold">Discount</th>
                <th scope="col" className="px-3 pb-2 text-right font-semibold">Tax</th>
                <th scope="col" className="pb-2 pl-3 text-right font-semibold">Total</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-dotted border-zinc-300 align-top break-inside-avoid last:border-b-0"
                >
                  <td className="py-4 pr-4"><ItemName item={item} /></td>
                  <td className="px-3 py-4 text-right tabular-nums">{item.quantity ?? 1}</td>
                  <td className="px-3 py-4 text-right tabular-nums">{money(item.base_price)}</td>
                  <td className="px-3 py-4 text-right tabular-nums"><DiscountCell item={item} money={money} /></td>
                  <td className="px-3 py-4 text-right tabular-nums"><TaxCell item={item} money={money} /></td>
                  <td className="py-4 pl-3 text-right text-base font-bold tabular-nums">{money(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="mt-3 divide-y divide-dotted divide-zinc-300 md:hidden">
            {items.map((item) => (
              <li key={item.id} className="py-4 first:pt-1 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <ItemName item={item} />
                  <p className="shrink-0 text-base font-bold tabular-nums">{money(item.total_price)}</p>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-zinc-600">Qty</dt>
                    <dd className="font-medium tabular-nums">{item.quantity ?? 1}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-600">Price</dt>
                    <dd className="font-medium tabular-nums">{money(item.base_price)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-600">Discount</dt>
                    <dd className="font-medium tabular-nums"><DiscountCell item={item} money={money} /></dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-600">Tax</dt>
                    <dd className="font-medium tabular-nums"><TaxCell item={item} money={money} /></dd>
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
