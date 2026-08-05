import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { recordQuery } from "./query-counter";

/**
 * Managed Postgres providers (Neon, Vercel Postgres, Supabase) require TLS
 * and typically front the database with a self-signed-from-the-client's-
 * perspective cert chain — `rejectUnauthorized: false` is the standard
 * node-postgres pattern for this, not a security downgrade from the local
 * dev default (a plain unencrypted localhost connection has no TLS at
 * all). Local Postgres (this build's dev/CI default) stays unencrypted.
 */
const isLocal = (process.env.DATABASE_URL ?? "").includes("localhost") || (process.env.DATABASE_URL ?? "").includes("127.0.0.1");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

export const db = drizzle(pool, {
  schema,
  logger: { logQuery: (query) => recordQuery(query) },
});
