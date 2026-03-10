import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://sales_saas:sales_saas@localhost:5434/sales_aaas";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool);
