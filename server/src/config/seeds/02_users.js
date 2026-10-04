const { hashPassword } = require("../../utils/hashhelper");

/**
 * Depends on: branches (seed 01_branches must run first).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Delete existing users so the seed can safely be re-run.
  // (user_tokens cascade; members.assigned_trainer_id is set to NULL.)
  await knex("users").del();

  // Look up branch ids by code (auto-increment ids are not guaranteed to start at 1).
  const branches = await knex("branches").select("id", "code");
  const branchId = Object.fromEntries(branches.map((b) => [b.code, b.id]));

  await knex("users").insert([
    {
      branch_id: branchId["MAIN"],
      full_name: "Gym Owner",
      email: "owner@gym.com",
      password: await hashPassword("owner123"),
      role: "owner",
      is_active: true,
    },
    {
      branch_id: branchId["MAIN"],
      full_name: "Gym Manager",
      email: "manager@gym.com",
      password: await hashPassword("manager123"),
      role: "manager",
      is_active: true,
    },
    {
      branch_id: branchId["ANNA-NAGAR"],
      full_name: "Front Desk",
      email: "frontdesk@gym.com",
      password: await hashPassword("frontdesk123"),
      role: "front_desk",
      is_active: true,
    },
    {
      branch_id: branchId["ANNA-NAGAR"],
      full_name: "Gym Trainer",
      email: "trainer@gym.com",
      password: await hashPassword("trainer123"),
      role: "trainer",
      is_active: true,
    },
  ]);
};
