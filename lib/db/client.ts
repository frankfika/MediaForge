import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

let db: ReturnType<typeof make> | null | undefined;
const make = (url: string) => drizzle(new Pool({ connectionString: url }), { schema });

/** Lazy singleton. Returns null when DATABASE_URL is unset so callers can fall back to localStorage / stateless mode. */
export function getDb() {
  if (db === undefined) db = process.env.DATABASE_URL ? make(process.env.DATABASE_URL) : null;
  return db;
}
