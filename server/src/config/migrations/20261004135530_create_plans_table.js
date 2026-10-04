/**
 * Create plans table
 *
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("plans", (table) => {
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

    // Plan details
    table.string("name", 100).notNullable();
    table.integer("duration_days").unsigned().notNullable();
    table.bigInteger("price_minor").unsigned().notNullable();
    table.integer("max_freeze_days").unsigned().notNullable().defaultTo(0);
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

    // Same plan name can exist in different branches
    table.unique(["branch_id", "name"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("plans");
};
