/**
 * Depends on: branches (must be migrated first).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = async function (knex) {
  await knex.schema.createTable("users", (table) => {
    // Internal database ID
    table.increments("id").primary();

    // Business/user ID
    table.string("user_id").unique().index().notNullable();

    // Branch relationship
    table.integer("branch_id").unsigned().nullable().index();

    table.string("full_name", 100).notNullable();

    table.string("email", 150).notNullable().unique();

    table.string("password", 255).notNullable();

    table
      .enum("role", ["owner", "manager", "front_desk", "trainer"])
      .notNullable()
      .defaultTo("front_desk");

    table.boolean("is_active").notNullable().defaultTo(true);

    // Created information
    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP"));

    table.integer("created_by").unsigned().nullable().defaultTo(1);

    // Updated information
    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.integer("updated_by").unsigned().nullable();

    // Soft delete information
    table.timestamp("deleted_at").nullable().index();

    table.integer("deleted_by").unsigned().nullable();

    // Branch relationship
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    // Created by relationship
    table
      .foreign("created_by")
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    // Updated by relationship
    table
      .foreign("updated_by")
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    // Deleted by relationship
    table
      .foreign("deleted_by")
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("users");
};
