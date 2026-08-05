import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { recordQuery } from "./query-counter";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema,
  logger: { logQuery: (query) => recordQuery(query) },
});
