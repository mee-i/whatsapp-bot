import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

import { Pool } from "pg";
const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
});

export const increment = (column: string, value = 1) => {
    return sql`${column} + ${value}`;
};
export const db = drizzle({ client: pool });
export * from "drizzle-orm";
export * from "./schema.ts";
