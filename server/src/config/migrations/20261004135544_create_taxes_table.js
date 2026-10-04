/**
 * Create taxes table
 *
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("taxes", (table) => {
    table.increments("id").primary();

    // Branch
    table
      .integer("branch_id")
      .unsigned()
      .notNullable()
      .index()
      .references("id")
      .inTable("branches")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");

    // Tax details
    table.string("name", 100).notNullable();

    table.decimal("rate", 5, 2).notNullable();

    table.string("description", 255).nullable();

    table.boolean("is_active").notNullable().defaultTo(true);

    // Audit fields
    table
      .integer("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    table
      .integer("updated_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    table
      .integer("deleted_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    // Soft delete
    table.timestamp("deleted_at").nullable();

    // Timestamps
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    // Unique tax name per branch
    table.unique(["branch_id", "name"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("taxes");
};
