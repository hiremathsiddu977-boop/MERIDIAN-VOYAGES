import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

declare global {
  var _postgresPool: Pool | undefined;
  var _schemaReadyPromise: Promise<void> | undefined;
}

function getConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    undefined
  );
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getConnectionString() || process.env.SQL_HOST?.trim());
}

export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString = getConnectionString();
    if (connectionString) {
      const isLocal =
        connectionString.includes('localhost') ||
        connectionString.includes('127.0.0.1');
      global._postgresPool = new Pool({
        connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 15000,
        connectionTimeoutMillis: 10000,
      });
    } else {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
      });
    }

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });

export async function ensureSchemaReady(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'Database is not configured. Add DATABASE_URL to your environment variables.'
    );
  }
  if (!global._schemaReadyPromise) {
    global._schemaReadyPromise = (async () => {
      // Fast check first — if all core tables exist, skip DDL statements
      const check = await pool.query<{ exists: boolean }>(
        `SELECT (
          to_regclass('public.users') IS NOT NULL AND
          to_regclass('public.bookings') IS NOT NULL AND
          to_regclass('public.expenses') IS NOT NULL AND
          to_regclass('public.inquiries') IS NOT NULL AND
          to_regclass('public.destinations') IS NOT NULL
        ) AS exists`
      );
      if (check.rows[0]?.exists) return;

      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          uid TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'customer',
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS bookings (
          id SERIAL PRIMARY KEY,
          reference TEXT NOT NULL UNIQUE,
          package_slug TEXT NOT NULL,
          package_title TEXT NOT NULL,
          destination TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          departure_date TEXT NOT NULL,
          guests BIGINT NOT NULL,
          tier TEXT NOT NULL,
          revenue BIGINT NOT NULL,
          cost BIGINT NOT NULL,
          status TEXT NOT NULL DEFAULT 'confirmed',
          notes TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          amount BIGINT NOT NULL,
          entry_type TEXT NOT NULL DEFAULT 'expense',
          package_slug TEXT NOT NULL DEFAULT 'general',
          recorded_date TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS inquiries (
          id SERIAL PRIMARY KEY,
          reference TEXT NOT NULL UNIQUE,
          company_or_name TEXT NOT NULL,
          email TEXT NOT NULL,
          destination TEXT NOT NULL,
          group_size BIGINT NOT NULL,
          details TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'open',
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS destinations (
          id SERIAL PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          location TEXT NOT NULL,
          country TEXT NOT NULL,
          region TEXT NOT NULL,
          days INTEGER NOT NULL,
          nights INTEGER NOT NULL,
          max_guests INTEGER NOT NULL,
          base_price INTEGER NOT NULL,
          private_upgrade INTEGER NOT NULL,
          season TEXT NOT NULL,
          rating TEXT NOT NULL DEFAULT '5.0',
          summary TEXT NOT NULL,
          image TEXT NOT NULL,
          highlights JSONB NOT NULL,
          included JSONB NOT NULL,
          departures JSONB NOT NULL,
          itinerary JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    })().catch((err) => {
      global._schemaReadyPromise = undefined;
      throw err;
    });
  }
  return global._schemaReadyPromise;
}
