export async function up(knex) {
  await knex.schema.createTable("members", (table) => {
    // Internal database ID
    table.increments("id").primary();

    // Business/member ID - can be changed later
    table.integer("member_Id").unsigned().notNullable().unique().index();

    table.integer("branch_id").unsigned().notNullable().index();

    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();

    table.string("phone", 20).notNullable();
    table.string("email", 255).nullable();

    table.tinyint("is_active").notNullable().defaultTo(1);

    table.date("joined_on").notNullable();

    table.integer("assigned_trainer_id").unsigned().nullable().index();

    // Avatar URL
    table.string("avatar_url", 500).nullable();

    table.dateTime("dob").nullable();

    // Automatically set when record is created
    table
      .timestamp("created_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP"));

    table.integer("created_by").unsigned().notNullable().defaultTo(1);

    // Automatically updated whenever the row changes
    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.integer("updated_by").unsigned().notNullable();

    table.dateTime("deleted_at").nullable().index();
    table.integer("deleted_by").nullable().unsigned();

    // Branch relationship
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");

    // Trainer relationship
    table
      .foreign("assigned_trainer_id")
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    // Phone must be unique within a branch
    table.unique(["branch_id", "phone"], "members_branch_phone_unique");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("members");
}
