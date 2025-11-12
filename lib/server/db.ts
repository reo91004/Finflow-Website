import Database from "better-sqlite3"
import path from "path"

const DB_PATH = path.join(process.cwd(), "scripts", "finflow.db")

let db: Database.Database | null = null

function getInstance(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma("foreign_keys = ON")
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        hashed_password TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);
      CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);
    `)
  }
  return db
}

export function getDb(): Database.Database {
  return getInstance()
}
