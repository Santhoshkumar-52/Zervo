export async function up(knex) {
  await knex.schema.createTable("branches", (table) => {
    table.increments("id").primary();

    // Mandatory
    table.string("name", 150).notNullable();

    // Mandatory and unique
    table.string("code", 50).notNullable().unique();

    // Optional
    table.string("address", 255).nullable();

    // Optional
    table.string("phone", 20).nullable();

    // UTC timestamps
    table.dateTime("created_at").notNullable();

    table.dateTime("updated_at").notNullable();
    table.tinyint("is_active").notNullable().defaultTo(1);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("branches");
}
