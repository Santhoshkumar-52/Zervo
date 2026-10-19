const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");

// ---------------------------------------------------------------------------
// Loaders: one promise-returning function per piece of data the client needs
// right after login. Each loader resolves with its data or rejects with an
// error. Add a new loader here and register it in `loaders` below.
// ---------------------------------------------------------------------------

// All active branches (is_active = 1)
const loadActiveBranches = () =>
  db("branches")
    .where({ is_active: 1 })
    .select(
      "id",
      "name",
      "code",
      "logo",
      "attend_background",
      "address",
      "phone",
      "currency",
      "subbill_url",
      "is_active",
    )
    .orderBy("name", "asc")
    .then((rows) =>
      rows.map((branch) => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        logo: branch.logo,
        attendBackground: branch.attend_background,
        address: branch.address,
        phone: branch.phone,
        currency: branch.currency,
        subbillUrl: branch.subbill_url,
        isActive: Boolean(branch.is_active),
      })),
    );

// key -> loader. The key becomes the property name in the response.
const loaders = {
  branches: loadActiveBranches,
  // payments: () => loadPayments(branchId),   <- add more here
};

// GET /api/init
// Runs every loader together. Promise.all only resolves when ALL of them
// succeed; if any one rejects, the whole request fails (nothing partial is sent).
const getInitData = async (req, res) => {
  try {
    const keys = Object.keys(loaders);

    const results = await Promise.all(keys.map((key) => loaders[key](req)));

    // Rebuild { branches: [...], ... } from the results (same order as keys)
    const data = keys.reduce((acc, key, index) => {
      acc[key] = results[index];
      return acc;
    }, {});

    return successResponse(res, data, "Initial data loaded successfully");
  } catch (error) {
    console.error("Init data error:", error);

    return errorResponse(res, "Failed to load initial data", 500);
  }
};

module.exports = {
  getInitData,
  loadActiveBranches,
};
