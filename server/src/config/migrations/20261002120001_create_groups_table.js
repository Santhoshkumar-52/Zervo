/**
 * Create groups table (staff roles)
 *
 * Flow: branches -> groups -> users -> members
 *
 * groups is created BEFORE users, so its audit columns (created_by,
 * updated_by, deleted_by) cannot reference users yet. They are plain
 * columns here; the foreign keys to users are added at the end of the
 * users migration.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("groups", (table) => {
    table.increments("id").primary();

    table.string("name", 50).notNullable().unique();

    table.string("description", 255).nullable();

    table.boolean("is_active").notNullable().defaultTo(true);

    // Audit fields (FKs to users are added in the users migration)
    table.integer("created_by").unsigned().nullable();

    table.integer("updated_by").unsigned().nullable();

    table.integer("deleted_by").unsigned().nullable();

    // Soft delete
    table.timestamp("deleted_at").nullable();

    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("groups");
};
