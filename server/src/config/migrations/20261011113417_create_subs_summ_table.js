/**
 * Subscription summary (header) table.
 * One row per subscription; line items live in `subs_items`.
 * All money values are stored in paise (minor units).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("subs_summ", (table) => {
    table.increments("id").primary();
    table.integer("bill_no").unsigned().notNullable();
    table.enu("bill_type", ["new", "renew"]).defaultTo("new");
    table.date("bill_date").notNullable();
    table.integer("branch_id").unsigned().notNullable();

    // Member and branch details
    table.integer("member_id").unsigned().notNullable();

    // Subscription details
    table.string("subscription_no", 50).nullable();
    table.date("start_date").notNullable();
    table.date("end_date").notNullable();

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

    // Final price, including tax
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
    table.index(["branch_id", "member_id"], "idx_subs_summ_branch_member");
    table.index(["member_id", "end_date"], "idx_subs_summ_member_end_date");
    table.unique(["branch_id", "subscription_no"], {
      indexName: "uq_subs_summ_branch_subscription_no",
    });

    // Foreign keys
    table
      .foreign("branch_id", "fk_subs_summ_branch")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");

    table
      .foreign("member_id", "fk_subs_summ_member")
      .references("id")
      .inTable("members")
      .onDelete("RESTRICT");

    table
      .foreign("created_by", "fk_subs_summ_created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table
      .foreign("updated_by", "fk_subs_summ_updated_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table
      .foreign("deleted_by", "fk_subs_summ_deleted_by")
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
  // subs_items (child) is dropped by its own migration, which rolls back first.
  await knex.schema.dropTableIfExists("subs_summ");
};
