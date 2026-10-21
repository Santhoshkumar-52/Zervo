/**
 * Seed discounts
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

  const discounts = [
    // MAIN
    {
      branch_id: branchId["MAIN"],
      name: "New Member",
      type: 1,
      type_name: "percentage",
      value: 10.0,
      description: "10% discount for new members",
      is_active: true,
      starts_on: null,
      ends_on: null,
      created_by: 1,
    },
    {
      branch_id: branchId["MAIN"],
      name: "Annual Membership",
      type: 1,
      type_name: "percentage",
      value: 15.0,
      description: "Discount for annual membership",
      is_active: true,
      starts_on: null,
      ends_on: null,
      created_by: 1,
    },
    {
      branch_id: branchId["MAIN"],
      name: "Referral Discount",
      type: 2,
      type_name: "fixed",
      value: 500.0,
      description: "Referral discount",
      is_active: true,
      starts_on: null,
      ends_on: null,
      created_by: 1,
    },

    // ANNA-NAGAR
    {
      branch_id: branchId["ANNA-NAGAR"],
      name: "New Member",
      type: 1,
      type_name: "percentage",
      value: 10.0,
      description: "10% discount for new members",
      is_active: true,
      starts_on: null,
      ends_on: null,
      created_by: 1,
    },
    {
      branch_id: branchId["ANNA-NAGAR"],
      name: "Annual Membership",
      type: 1,
      type_name: "percentage",
      value: 15.0,
      description: "Discount for annual membership",
      is_active: true,
      starts_on: null,
      ends_on: null,
      created_by: 1,
    },
    {
      branch_id: branchId["ANNA-NAGAR"],
      name: "Referral Discount",
      type: 2,
      type_name: "fixed",
      value: 500.0,
      description: "Referral discount",
      is_active: true,
      starts_on: null,
      ends_on: null,
      created_by: 1,
    },
  ];

  await knex("discounts")
    .insert(discounts)
    .onConflict(["branch_id", "name"])
    .ignore();
};
