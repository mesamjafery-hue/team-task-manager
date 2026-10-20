const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let pool = null;
let isFallback = false;
let memDbInstance = null;

// SSL configuration for Cloud SQL / production managed databases
const sslConfig = process.env.DB_SSL === 'true' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require'))
  ? { rejectUnauthorized: false }
  : false;

function createPgPool() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
    });
  }

  return new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'team_task_manager',
    ssl: sslConfig,
  });
}

// In-memory fallback using pg-mem for local dev fallback or tests
function initFallbackDb() {
  if (memDbInstance) return memDbInstance;
  const { newDb } = require('pg-mem');
  const db = newDb();

  // Load and apply initial schema
  const schemaPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.public.none(schemaSql);
  }

  const pgAdapter = db.adapters.createPg();
  memDbInstance = new pgAdapter.Pool();
  isFallback = true;
  console.log('ℹ️ Using embedded in-memory PostgreSQL engine for local development/testing.');
  return memDbInstance;
}

// Initialize database pool
async function getPool() {
  if (pool) return pool;

  // In test environment, if configured to use in-memory fallback:
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_LIVE_DB) {
    pool = initFallbackDb();
    return pool;
  }

  try {
    const candidatePool = createPgPool();
    // Test connection with a short timeout
    const client = await Promise.race([
      candidatePool.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 2500))
    ]);
    client.release();
    pool = candidatePool;
    console.log(' Connected to PostgreSQL database successfully.');
    return pool;
  } catch (err) {
    if (process.env.USE_LOCAL_FALLBACK_IF_NO_PG === 'true' || process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️ Could not connect to external PostgreSQL (${err.message}). Activating local in-memory PostgreSQL fallback.`);
      pool = initFallbackDb();
      return pool;
    }
    console.error('❌ Failed to connect to PostgreSQL database:', err.message);
    throw err;
  }
}

// Helper query function with automatic connection handling
async function query(text, params = []) {
  const p = await getPool();
  return p.query(text, params);
}

// Helper to acquire client for transactions
async function getClient() {
  const p = await getPool();
  return p.connect();
}

function isUsingFallback() {
  return isFallback;
}

module.exports = {
  getPool,
  query,
  getClient,
  isUsingFallback,
  initFallbackDb,
};
