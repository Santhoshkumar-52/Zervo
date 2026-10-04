export async function seed(knex) {
  // Avoid duplicate seed records.
  await knex("members").del();

  // Look up ids (auto-increment ids are not guaranteed to start at 1 on re-runs).
  const branches = await knex("branches").select("id", "code");
  const branchId = Object.fromEntries(branches.map((b) => [b.code, b.id]));

  const trainer = await knex("users").where({ role: "trainer" }).first("id");
  const trainerId = trainer ? trainer.id : null;

  await knex("members").insert([
    {
      branch_id: branchId["MAIN"],
      first_name: "Arun",
      last_name: "Kumar",
      phone: "9876543210",
      joined_on: "2026-01-10",
      assigned_trainer_id: trainerId,
      photo_url: "https://example.com/images/members/arun-kumar.jpg",
      deleted_at: null,
    },
    {
      branch_id: branchId["MAIN"],
      first_name: "Priya",
      last_name: "Sharma",
      phone: "9876543211",
      joined_on: "2026-02-15",
      assigned_trainer_id: trainerId,
      photo_url: "https://example.com/images/members/priya-sharma.jpg",
      deleted_at: null,
    },
    {
      branch_id: branchId["MAIN"],
      first_name: "Rahul",
      last_name: "Menon",
      phone: "9876543212",
      joined_on: "2026-03-05",
      assigned_trainer_id: null,
      photo_url: null,
      deleted_at: null,
    },
    {
      branch_id: branchId["ANNA-NAGAR"],
      first_name: "Sneha",
      last_name: "Reddy",
      phone: "9876543213",
      joined_on: "2026-03-20",
      assigned_trainer_id: trainerId,
      photo_url: "https://example.com/images/members/sneha-reddy.jpg",
      deleted_at: null,
    },
    {
      branch_id: branchId["ANNA-NAGAR"],
      first_name: "Vikram",
      last_name: "Patel",
      phone: "9876543214",
      joined_on: "2026-04-01",
      assigned_trainer_id: null,
      photo_url: null,
      deleted_at: null,
    },
  ]);
}
