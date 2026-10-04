/**
 * Seed groups (staff roles)
 *
 * Flow: branches -> groups -> users -> members
 *
 * The group names must match the roles used by the app
 * (staffController ROLES) and by the users seed.
 *
 * groups is lookup data that users reference (ON DELETE RESTRICT), so it is
 * upserted by name instead of deleted. Ids stay stable on re-runs.
 *
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  const groups = [
    {
      name: "owner",
      description: "Gym owner with full access to the system.",
    },
    {
      name: "manager",
      description: "Manages day-to-day operations of a branch.",
    },
    {
      name: "front_desk",
      description: "Front-desk access for members and check-ins.",
    },
    {
      name: "trainer",
      description: "Trainer who can be assigned to members.",
    },
  ];

  await knex("groups")
    .insert(
      groups.map((group) => ({
        ...group,
        is_active: true,
        created_by: null,
        updated_by: null,
        deleted_by: null,
        deleted_at: null,
      })),
    )
    .onConflict("name")
    .merge(["description", "is_active", "deleted_by", "deleted_at"]);
};
