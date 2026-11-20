const fs = require('fs');
const path = require('path');
const { getClient } = require('../src/config/database');

/**
 * Applies the SQL schema. Every statement uses IF NOT EXISTS, so this is safe to
 * run on every server start (which is how the Cloud Run deployment bootstraps a
 * fresh Cloud SQL database).
 */
async function runMigrations() {
  console.log(' Running database migrations...');
  const client = await getClient();
  try {
    const migrationFile = path.join(__dirname, '001_initial_schema.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log(' Migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigrations;
