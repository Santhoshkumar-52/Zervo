
exports.up = async function (knex) {
  await knex.schema.createTable("payments_status", (table) => {
    table.increments("id").unsigned().primary();

    table.string("subs_billno", 50).notNullable();

    table.integer("branch_id").unsigned().notNullable();
    table.integer("payment_id").unsigned().notNullable();

    table.bigInteger("total_price").unsigned().notNullable();

    table
      .enum("payments_status", [
        "draft",
        "pending",
        "cancelled",
        "completed",
      ])
      .notNullable()
      .defaultTo("draft");

    // Audit fields
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();

    // Timestamps
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(
        knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      );

    // Indexes
    table.index(["branch_id"], "idx_payments_status_branch_id");
    table.index(["payment_id"], "idx_payments_status_payment_id");
    table.index(["subs_billno"], "idx_payments_status_subs_billno");
    table.index(["payments_status"], "idx_payments_status_status");

    // Foreign keys
    table
      .foreign("branch_id", "fk_payments_status_branch")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");

    table
      .foreign("payment_id", "fk_payments_status_payment")
      .references("id")
      .inTable("payments")
      .onDelete("RESTRICT");

    table
      .foreign("created_by", "fk_payments_status_created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table
      .foreign("updated_by", "fk_payments_status_updated_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("payments_status");
};
