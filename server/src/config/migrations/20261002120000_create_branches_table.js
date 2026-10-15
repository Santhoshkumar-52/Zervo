export async function up(knex) {
  await knex.schema.createTable("branches", (table) => {
    table.increments("id").primary();

    // Mandatory
    table.string("name", 150).notNullable();
    table
      .string("logo", 2083)
      .defaultTo(
        "https://res.cloudinary.com/samxg4vp/image/upload/v1791735500/Zervo_Futuristic_Fitness_Logo_kpsxpd.png",
      );
    table
      .string("attend_background", 2083)
      .defaultTo(
        "https://res.cloudinary.com/samxg4vp/image/upload/v1792081467/istockphoto-610431768-1024x1024_mkqsfc.jpg",
      );

    // Mandatory and unique
    table.string("code", 50).notNullable().unique();

    // Optional
    table.string("address", 255).nullable();

    // Optional
    table.string("phone", 20).nullable();
    table.string("currency", 20).notNullable().defaultTo("₹");
    table.string("subbill_url", 2083).notNullable();

    // UTC timestamps
    table.dateTime("created_at").notNullable();

    table.dateTime("updated_at").notNullable();
    table.tinyint("is_active").notNullable().defaultTo(1);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("branches");
}
