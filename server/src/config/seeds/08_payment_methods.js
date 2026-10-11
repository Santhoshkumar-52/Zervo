exports.seed = async function (knex) {
  // Remove existing sample records to prevent duplicates
  await knex("payments").whereIn("payment_name", ["Cash", "Card", "UPI"]).del();

  await knex("payments").insert([
    {
      branch_id: 1,
      payment_name: "Cash",
    },
    {
      branch_id: 1,
      payment_name: "Card",
    },
    {
      branch_id: 1,
      payment_name: "UPI",
    },
  ]);
};
