import { Pool } from 'pg';

declare global {
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString || connectionString.includes('x:x@localhost')) {
    // Build-time placeholder — return a dummy pool that won't connect
    console.log('[db] Build mode — DB not connected');
  }

  const isCloud =
    connectionString?.includes('neon.tech') ||
    connectionString?.includes('neon.database') ||
    process.env.NODE_ENV === 'production';

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ...(isCloud ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

// Lazy pool — only created when first used
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = global._pgPool ?? createPool();
    if (process.env.NODE_ENV !== 'production') {
      global._pgPool = _pool;
    }
  }
  return _pool;
}

export const db = new Proxy({} as Pool, {
  get(_target, prop) {
    return getPool()[prop as keyof Pool];
  },
});

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    if (process.env.NODE_ENV === 'development') {
      console.log('Query:', { sql: text.slice(0, 80), ms: Date.now() - start, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('DB query error:', err);
    throw err;
  }
}

export default db;
