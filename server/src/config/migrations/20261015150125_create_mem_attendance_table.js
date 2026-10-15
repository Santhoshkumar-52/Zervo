/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.up = async function (knex) {
  await knex.schema.createTable("mem_attendance", (table) => {
    table.increments("id").primary();

    table
      .integer("member_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("members")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");

    table.dateTime("checkinat").notNullable();
    table.dateTime("checkoutat").nullable();

    table
      .integer("branch_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("branches")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");

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

    table
      .tinyint("system_checkout")
      .nullable()
      .defaultTo(null)
      .comment(
        "1 = automatic checkout, 0 = manual checkout, NULL = not applicable",
      );

    table.timestamps(true, true);

    table.index(
      ["member_id", "checkinat"],
      "idx_mem_attendance_member_checkinat",
    );

    table.index(
      ["branch_id", "checkinat"],
      "idx_mem_attendance_branch_checkinat",
    );
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("mem_attendance");
};
