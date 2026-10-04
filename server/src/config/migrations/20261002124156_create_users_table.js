/**
 * Depends on: branches (must be migrated first).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("user_id").unique().index().notNullable();

    table.integer("branch_id").unsigned().nullable().index();

    table.string("full_name", 100).notNullable();

    table.string("email", 150).notNullable().unique();

    table.string("password", 255).notNullable();

    table
      .enum("role", ["owner", "manager", "front_desk", "trainer"])
      .notNullable()
      .defaultTo("front_desk");

    table.boolean("is_active").notNullable().defaultTo(true);

    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("users");
};
