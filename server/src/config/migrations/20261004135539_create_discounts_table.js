/**
 * Create discounts table
 *
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("discounts", (table) => {
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

    // Discount details
    table.string("name", 100).notNullable();
    table.tinyint("type").nullable().comment("1: percentage, 2: fixed");
    table.enu("type_name", ["percentage", "fixed"]).notNullable();

    table.decimal("value", 10, 2).notNullable();

    table.string("description", 255).nullable();

    table.boolean("is_active").notNullable().defaultTo(true);

    table.date("starts_on").nullable();
    table.date("ends_on").nullable();

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

    // Unique discount name per branch
    table.unique(["branch_id", "name"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("discounts");
};
