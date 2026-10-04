export async function seed(knex) {
  // 1/4 of branches -> groups -> users -> members. members reference branches (ON DELETE RESTRICT), so clear them first.
  // users.branch_id is ON DELETE SET NULL; the users seed re-creates users afterwards.
  await knex("members").del();
  await knex("branches").del();

  await knex("branches").insert([
    {
      name: "Main Branch",
      code: "MAIN",
      address: "Chennai",
      phone: "04412345678",
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: "Anna Nagar Branch",
      code: "ANNA-NAGAR",
      address: "Anna Nagar, Chennai",
      phone: "04412345679",
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}
