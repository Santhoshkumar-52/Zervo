exports.up = async function (knex) {
  await knex.schema.createTable("payments", (table) => {
    table.increments("id").unsigned().primary();

    table.integer("branch_id").unsigned().notNullable();

    table.string("payment_name", 100).notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);

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
    table.index(["branch_id"], "idx_payments_branch_id");

    // Foreign keys
    table
      .foreign("branch_id", "fk_payments_branch")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");

    table
      .foreign("created_by", "fk_payments_created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table
      .foreign("updated_by", "fk_payments_updated_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table
      .foreign("deleted_by", "fk_payments_deleted_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("payments");
};
