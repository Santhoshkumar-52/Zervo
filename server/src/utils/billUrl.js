// Where a customer opens their bill after a payment:
//
//   CLIENT_URL + "/" + branches.subbill_url + "?id=" + bill_no
//
// e.g. CLIENT_URL=http://localhost:5173, subbill_url="summary-bill", bill 1042
//   -> http://localhost:5173/summary-bill?id=1042
//
// subbill_url is stored per branch and can be any path the client serves. It is
// attached as it is (stray slashes around it are ignored). Returns null when
// the pieces are missing, so a bad setting never breaks a saved payment.
let warnedNoClientUrl = false;

const buildBillUrl = (subbillUrl, billNo) => {
  const clientUrl = String(process.env.CLIENT_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  const path = String(subbillUrl ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "");

  if (!clientUrl) {
    if (!warnedNoClientUrl) {
      warnedNoClientUrl = true;
      console.error("Bill URL not built: CLIENT_URL is not set");
    }

    return null;
  }

  if (!path || billNo === undefined || billNo === null || billNo === "") {
    return null;
  }

  return `${clientUrl}/${path}?id=${encodeURIComponent(billNo)}`;
};

module.exports = { buildBillUrl };
