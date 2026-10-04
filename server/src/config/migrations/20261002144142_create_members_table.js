export async function up(knex) {
  await knex.schema.createTable("members", (table) => {
    table.increments("id").primary();

    table.integer("branch_id").unsigned().notNullable().index();

    table.string("first_name", 100).notNullable();

    table.string("last_name", 100).notNullable();

    table.string("phone", 20).notNullable();
    table.tinyint("is_active").notNullable().defaultTo(1);
    table.date("joined_on").notNullable();

    table.integer("assigned_trainer_id").unsigned().nullable().index();

    table.string("photo_url", 500).nullable();

    table.dateTime("deleted_at").nullable().index();

    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");

    table
      .foreign("assigned_trainer_id")
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    table.unique(["branch_id", "phone"], "members_branch_phone_unique");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("members");
}
