/**
 * Subscription line items (child of `subs_summ`).
 * All money values are stored in paise (minor units).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("subs_items", (table) => {
    table.increments("id").primary();

    // Parent subscription summary
    table.integer("subs_summ_id").unsigned().notNullable();

    // Item details
    table.string("item_type", 30).notNullable().defaultTo("membership");
    table.integer("plan_id").unsigned().nullable();
    table.string("item_name", 150).notNullable();
    
    table.string("item_description", 500).nullable();
    table.integer("quantity").unsigned().notNullable().defaultTo(1);

    // Subscription period (end date = start date + plan duration_days - 1)
    table.date("start_date").nullable();
    table.date("end_date").nullable();

    // Pricing details (paise)
    table.bigInteger("base_price").unsigned().notNullable().defaultTo(0);
    table.tinyint("discount_type").unsigned().notNullable().defaultTo(0);

    // Calculated discount amount
    table.bigInteger("discount_price").unsigned().notNullable().defaultTo(0);

    // Original discount percentage, when applicable
    table.decimal("discount_rate", 7, 4).unsigned().nullable();

    // Price after discount, before tax
    table.bigInteger("discounted_price").unsigned().notNullable().defaultTo(0);

    table.decimal("tax_percent", 5, 2).unsigned().notNullable().defaultTo(0);
    table.bigInteger("tax_amount").unsigned().notNullable().defaultTo(0);

    // Final item price, including tax
    table.bigInteger("total_price").unsigned().notNullable().defaultTo(0);

    // Audit fields
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();
    table.integer("deleted_by").unsigned().nullable();

    // Timestamps
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    // Soft delete
    table.timestamp("deleted_at").nullable();

    // Indexes
    table.index(["subs_summ_id"], "idx_subs_items_summ");
    table.index(["plan_id"], "idx_subs_items_plan");

    // Foreign keys
    table
      .foreign("subs_summ_id", "fk_subs_items_summ")
      .references("id")
      .inTable("subs_summ")
      .onDelete("RESTRICT");

    table
      .foreign("plan_id", "fk_subs_items_plan")
      .references("id")
      .inTable("plans")
      .onDelete("RESTRICT");

    table
      .foreign("created_by", "fk_subs_items_created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table
      .foreign("updated_by", "fk_subs_items_updated_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table
      .foreign("deleted_by", "fk_subs_items_deleted_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("subs_items");
};
