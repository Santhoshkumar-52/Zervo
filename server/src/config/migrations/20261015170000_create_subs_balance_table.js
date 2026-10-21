/**
 * Subscription balance table.
 * Tracks, per bill, how much has been paid when the bill is only partly paid,
 * and how much of the remainder was written off.
 * All money values are stored in paise (minor units), like `subs_summ`.
 *
 * `bill_no` is not a foreign key because `subs_summ.bill_no` is not unique on
 * its own (it is scoped by branch).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("subs_balance", (table) => {
    table.increments("id").primary();

    table.integer("bill_no").unsigned().notNullable();
    table.integer("branch_id").unsigned().notNullable();

    // Amounts (paise)
    table
      .bigInteger("paid_amount")
      .unsigned()
      .notNullable()
      .defaultTo(0)
      .comment("Amount paid so far against the bill");
    table
      .boolean("written_off").defaultTo(false)

    // User who wrote the balance off
    table.integer("written_by").unsigned().nullable();

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
    table.unique(["branch_id", "bill_no"], {
      indexName: "uq_subs_balance_branch_bill_no",
    });

    // Foreign keys
    table
      .foreign("branch_id", "fk_subs_balance_branch")
      .references("id")
      .inTable("branches")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");

    table
      .foreign("written_by", "fk_subs_balance_written_by")
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    table
      .foreign("created_by", "fk_subs_balance_created_by")
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    table
      .foreign("updated_by", "fk_subs_balance_updated_by")
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    table
      .foreign("deleted_by", "fk_subs_balance_deleted_by")
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("subs_balance");
};
