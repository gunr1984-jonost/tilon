import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "alerts.db");

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Singleton — safe because Next.js API routes run in the same Node process
let _db: Database.Database | null = null;
let _backupScheduled = false;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.pragma("synchronous = NORMAL");       // faster writes, still crash-safe
  _db.pragma("cache_size = -65536");        // 64 MB page cache
  _db.pragma("temp_store = MEMORY");        // temp tables in RAM
  _db.pragma("wal_autocheckpoint = 1000");  // checkpoint after ~4 MB to keep WAL small

  // Apply schema
  const schema = fs.readFileSync(
    path.join(process.cwd(), "lib", "schema.sql"),
    "utf8"
  );
  _db.exec(schema);

  scheduleDailyBackup(_db);

  return _db;
}

function scheduleDailyBackup(db: Database.Database) {
  if (_backupScheduled) return;
  _backupScheduled = true;
  const run = () => {
    try {
      const backupPath = DB_PATH.replace(/\.db$/, "") + ".backup.db";
      db.backup(backupPath);
      console.log(`[db] Backup written to ${backupPath}`);
    } catch (err) {
      console.error("[db] Backup failed:", (err as Error).message);
    }
  };

  // Run once on startup, then every 24 hours
  run();
  setInterval(run, 24 * 60 * 60 * 1000);
}

export type AlertState = "PRE_ALERT" | "ACTIVE_SIREN" | "ALL_CLEAR" | "OTHER";

export interface AlertRow {
  id: number;
  tg_msg_id: number;
  sent_at: number;
  raw_text: string;
  state: AlertState;
  area: string;
  relevant: number;
}
