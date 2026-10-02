/**
 * Store the raw JWTs (not hashes) in user_tokens.
 * JWTs are longer than 255 chars, so the columns become TEXT.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  // Old rows only hold hashes, which are useless now
  await knex("user_tokens").del();

  await knex.raw(`
    ALTER TABLE user_tokens
      DROP INDEX user_tokens_access_token_hash_unique,
      DROP INDEX user_tokens_refresh_token_hash_unique,
      CHANGE access_token_hash access_token TEXT NOT NULL,
      CHANGE refresh_token_hash refresh_token TEXT NOT NULL
  `);
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex("user_tokens").del();

  await knex.raw(`
    ALTER TABLE user_tokens
      CHANGE access_token access_token_hash VARCHAR(255) NOT NULL,
      CHANGE refresh_token refresh_token_hash VARCHAR(255) NOT NULL,
      ADD UNIQUE user_tokens_access_token_hash_unique (access_token_hash),
      ADD UNIQUE user_tokens_refresh_token_hash_unique (refresh_token_hash)
  `);
};