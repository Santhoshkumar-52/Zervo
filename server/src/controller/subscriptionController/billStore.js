// The bill each user is currently building (items added, not yet saved as a
// subscription). It is kept in server memory, per branch + user, so it is
// cleared when the server restarts.
//
// TODO: when the bill can be saved, persist it to subs_summ / subs_items and
// replace this file with queries. The controller only uses getBill, addItem
// and toBill, so nothing else has to change.
const bills = new Map();

const keyOf = (branchId, userId) => `${branchId}:${userId}`;

const getItems = (branchId, userId) => bills.get(keyOf(branchId, userId)) ?? [];

const addItem = (branchId, userId, item) => {
  const items = [...getItems(branchId, userId), item];

  bills.set(keyOf(branchId, userId), items);

  return items;
};

// The shape the client table reads.
const toBill = (items) => ({
  items,
  totals: {
    item_count: items.length,
    grand_total_minor: items.reduce((sum, item) => sum + item.total_minor, 0),
  },
});

module.exports = { getItems, addItem, toBill };