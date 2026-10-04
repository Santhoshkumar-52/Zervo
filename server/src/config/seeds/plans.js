/**
 * Seed plans
 *
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  const branches = await knex("branches").select("id", "code");

  const branchId = Object.fromEntries(
    branches.map((branch) => [branch.code, branch.id]),
  );

  const requiredBranches = ["MAIN", "ANNA-NAGAR"];

  for (const code of requiredBranches) {
    if (!branchId[code]) {
      throw new Error(`Branch not found: ${code}`);
    }
  }

  const plans = [
    // MAIN
    {
      branch_id: branchId["MAIN"],
      name: "Monthly",
      duration_days: 30,
      price_minor: 150000,
      max_freeze_days: 3,
      is_active: true,
      created_by: 1,
    },
    {
      branch_id: branchId["MAIN"],
      name: "Quarterly",
      duration_days: 90,
      price_minor: 400000,
      max_freeze_days: 7,
      is_active: true,
      created_by: 1,
    },
    {
      branch_id: branchId["MAIN"],
      name: "Half Yearly",
      duration_days: 180,
      price_minor: 700000,
      max_freeze_days: 15,
      is_active: true,
      created_by: 1,
    },
    {
      branch_id: branchId["MAIN"],
      name: "Yearly",
      duration_days: 365,
      price_minor: 1200000,
      max_freeze_days: 30,
      is_active: true,
      created_by: 1,
    },

    // ANNA-NAGAR
    {
      branch_id: branchId["ANNA-NAGAR"],
      name: "Monthly",
      duration_days: 30,
      price_minor: 140000,
      max_freeze_days: 3,
      is_active: true,
      created_by: 1,
    },
    {
      branch_id: branchId["ANNA-NAGAR"],
      name: "Quarterly",
      duration_days: 90,
      price_minor: 380000,
      max_freeze_days: 7,
      is_active: true,
      created_by: 1,
    },
    {
      branch_id: branchId["ANNA-NAGAR"],
      name: "Half Yearly",
      duration_days: 180,
      price_minor: 650000,
      max_freeze_days: 15,
      is_active: true,
      created_by: 1,
    },
    {
      branch_id: branchId["ANNA-NAGAR"],
      name: "Yearly",
      duration_days: 365,
      price_minor: 1100000,
      max_freeze_days: 30,
      is_active: true,
      created_by: 1,
    },
  ];

  await knex("plans").insert(plans).onConflict(["branch_id", "name"]).ignore();
};
