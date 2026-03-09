import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";
import * as schema from "./schema.js";

const MCP_KANBAN_DIR = path.join(os.homedir(), ".mcp-kanban");
const DB_PATH = path.join(MCP_KANBAN_DIR, "kanban.db");

let sqlite: Database.Database | null = null;
let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (drizzleDb) return drizzleDb;

  fs.mkdirSync(MCP_KANBAN_DIR, { recursive: true });

  sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  drizzleDb = drizzle(sqlite, { schema });

  return drizzleDb;
}

export function getRawDb(): Database.Database {
  if (!sqlite) getDb();
  return sqlite!;
}

export function closeDb(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    drizzleDb = null;
  }
}
