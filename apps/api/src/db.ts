import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";

pg.types.setTypeParser(1700, parseFloat); // NUMERIC -> number
pg.types.setTypeParser(1082, (v) => v); // DATE -> "AAAA-MM-DD" (sem fuso)

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

/** Aplica, em ordem, os .sql de /migrations que ainda não rodaram. */
export async function migrate() {
  await pool.query(
    "create table if not exists schema_migrations(name text primary key, applied_at timestamptz not null default now())",
  );
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if ((await pool.query("select 1 from schema_migrations where name=$1", [file])).rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(readFileSync(path.join(dir, file), "utf8"));
      await client.query("insert into schema_migrations(name) values($1)", [file]);
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }
}
