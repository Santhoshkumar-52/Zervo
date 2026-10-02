/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("user_tokens", (table) => {
    table.increments("id").primary();

    table.integer("user_id").unsigned().notNullable().index();

    table.string("access_token_hash", 255).notNullable().unique();

    table.string("refresh_token_hash", 255).notNullable().unique();

    table.dateTime("access_token_expires_at").notNullable();

    table.dateTime("refresh_token_expires_at").notNullable();

    table.boolean("is_revoked").notNullable().defaultTo(false);

    table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());

    table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());

    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("user_tokens");
};
