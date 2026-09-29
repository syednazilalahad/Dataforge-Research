import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
type Row = Record<string, unknown>;
export interface Connection {
  query<T = Row>(sql: string, params?: unknown[]): Promise<{
    rows: T[];
  }>;
}
interface Database extends Connection {
  transaction<T>(fn: (tx: Connection) => Promise<T>): Promise<T>;
}
let embedded: PGlite | undefined;
async function initialize(): Promise<Database> {
  let db: Database;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10
    });
    db = {
      query: async <T,>(sql: string, params?: unknown[]) => ({
        rows: (await pool.query(sql, params)).rows as T[]
      }),
      transaction: async fn => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn({
            query: async <T,>(sql: string, params?: unknown[]) => ({
              rows: (await client.query(sql, params)).rows as T[]
            })
          });
          await client.query('COMMIT');
          return result;
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }
    };
  } else {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_DATABASE !== 'true') throw new Error('Production requires DATABASE_URL.');
    const location = process.env.LOCAL_DATABASE_PATH || '.data/db';
    if (location !== ':memory:') await mkdir(path.resolve(location), {
      recursive: true
    });
    embedded = new PGlite(location === ':memory:' ? undefined : location);
    db = {
      query: async <T,>(sql: string, params?: unknown[]) => ({
        rows: (await embedded!.query<T>(sql, params)).rows
      }),
      transaction: async fn => embedded!.transaction(async tx => fn({
        query: async <T,>(sql: string, params?: unknown[]) => ({
          rows: (await tx.query<T>(sql, params)).rows
        })
      }))
    };
  }
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  // One transaction and an advisory lock coordinate concurrent PostgreSQL startup migrations.
  await db.transaction(async tx => {
    if (process.env.DATABASE_URL) await tx.query('SELECT pg_advisory_xact_lock(728391)');
    const done = await tx.query('SELECT version FROM schema_migrations WHERE version=$1', ['001']);
    if (!done.rows.length) {
      const sql = await readFile(path.join(process.cwd(), 'migrations/001_initial.sql'), 'utf8');
      for (const statement of sql.split(';').filter(s => s.trim())) await tx.query(statement);
      await tx.query('INSERT INTO schema_migrations(version) VALUES($1)', ['001']);
    }
  });
  return db;
}
const globalDb = globalThis as typeof globalThis & {
  researchForgeDb?: Promise<Database>;
};
export function database() {
  return globalDb.researchForgeDb ??= initialize();
}
export async function query<T = Row>(sql: string, params: unknown[] = []) {
  return (await database()).query<T>(sql, params);
}
