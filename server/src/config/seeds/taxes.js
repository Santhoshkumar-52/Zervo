/**
 * Seed taxes
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

  const taxes = [
    // MAIN
    {
      branch_id: branchId["MAIN"],
      name: "GST",
      rate: 18.0,
      description: "Goods and Services Tax",
      is_active: true,
      created_by: 1,
    },

    // ANNA-NAGAR
    {
      branch_id: branchId["ANNA-NAGAR"],
      name: "GST",
      rate: 18.0,
      description: "Goods and Services Tax",
      is_active: true,
      created_by: 1,
    },
  ];

  await knex("taxes").insert(taxes).onConflict(["branch_id", "name"]).ignore();
};
