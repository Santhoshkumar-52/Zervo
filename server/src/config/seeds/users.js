const { hashPassword } = require("../../utils/hashhelper");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Delete existing users so the seed can safely be re-run.
  await knex("users").del();

  await knex("users").insert([
    {
      full_name: "Gym Owner",
      email: "owner@gym.com",
      password: await hashPassword("owner123"),
      role: "owner",
      is_active: true,
    },
    {
      full_name: "Gym Manager",
      email: "manager@gym.com",
      password: await hashPassword("manager123"),
      role: "manager",
      is_active: true,
    },
    {
      full_name: "Front Desk",
      email: "frontdesk@gym.com",
      password: await hashPassword("frontdesk123"),
      role: "front_desk",
      is_active: true,
    },
    {
      full_name: "Gym Trainer",
      email: "trainer@gym.com",
      password: await hashPassword("trainer123"),
      role: "trainer",
      is_active: true,
    },
  ]);
};
