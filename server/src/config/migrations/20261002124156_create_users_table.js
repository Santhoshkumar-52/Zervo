/**
 * Flow: branches -> groups -> users -> members
 *
 * Depends on: branches, groups (must be migrated first).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const GROUP_AUDIT_COLUMNS = ["created_by", "updated_by", "deleted_by"];

exports.up = async function (knex) {
  await knex.schema.createTable("users", (table) => {
    // Internal database ID
    table.increments("id").primary();

    // Business/user ID
    table.string("user_id").unique().index().notNullable();

    // Branch relationship
    table.integer("branch_id").unsigned().nullable().index();

    // Group / role relationship
    table.integer("group_id").unsigned().notNullable().index();

    table.string("full_name", 100).notNullable();

    table.string("email", 150).notNullable().unique();

    table.string("password", 255).notNullable();

    table.boolean("is_active").notNullable().defaultTo(true);

    // Created information
    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP"));

    table.integer("created_by").unsigned().nullable();

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

    // Group relationship
    table
      .foreign("group_id")
      .references("id")
      .inTable("groups")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");

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

  // groups is created before users, so its audit foreign keys are added now.
  await knex.schema.alterTable("groups", (table) => {
    for (const column of GROUP_AUDIT_COLUMNS) {
      table
        .foreign(column)
        .references("id")
        .inTable("users")
        .onUpdate("CASCADE")
        .onDelete("SET NULL");
    }
  });
};

exports.down = async function (knex) {
  // groups.created_by / updated_by / deleted_by point at users: drop them first.
  await knex.schema.alterTable("groups", (table) => {
    for (const column of GROUP_AUDIT_COLUMNS) {
      table.dropForeign(column);
    }
  });

  await knex.schema.dropTableIfExists("users");
};
