import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic, QueryExecResult } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

// ============================================================
// Statement wrapper — mimics better-sqlite3 Statement API
// ============================================================
class Statement {
  private sql: string;

  constructor(sql: string) {
    this.sql = sql;
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint } {
    if (!db) throw new Error('Database not initialized');
    const flatParams = this.flattenParams(params);
    (db._db as any).run(this.sql, flatParams);
    const lastId = db._exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] ?? 0;
    const changes = db._exec('SELECT changes() as c')[0]?.values[0]?.[0] ?? 0;
    return { changes: Number(changes), lastInsertRowid: Number(lastId) };
  }

  get(...params: unknown[]): any {
    if (!db) throw new Error('Database not initialized');
    const flatParams = this.flattenParams(params);
    const stmt = db._db.prepare(this.sql);
    if (flatParams.length > 0) (stmt as any).bind(flatParams);
    let result: Record<string, unknown> | undefined;
    if (stmt.step()) {
      result = stmt.getAsObject() as Record<string, unknown>;
    }
    stmt.free();
    return result;
  }

  all(...params: unknown[]): any[] {
    if (!db) throw new Error('Database not initialized');
    const flatParams = this.flattenParams(params);
    const stmt = db._db.prepare(this.sql);
    if (flatParams.length > 0) (stmt as any).bind(flatParams);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as Record<string, unknown>);
    }
    stmt.free();
    return results;
  }

  private flattenParams(params: unknown[]): unknown[] {
    if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
      // Named parameters not directly supported by sql.js prepare, convert to positional
      return Object.values(params[0] as Record<string, unknown>);
    }
    return params;
  }

  private save(): void {
    if (db) db.save();
  }
}

// ============================================================
// Database wrapper — mimics better-sqlite3 Database API
// ============================================================
class Database {
  _db: SqlJsDatabase;
  private dbPath: string;

  constructor(sqlDb: SqlJsDatabase, dbPath: string) {
    this._db = sqlDb;
    this.dbPath = dbPath;
  }

  prepare(sql: string): Statement {
    return new Statement(sql);
  }

  exec(sql: string): void {
    this._db.run(sql);
    this.save();
  }

  pragma(pragmaSql: string): void {
    this._db.run(`PRAGMA ${pragmaSql}`);
  }

  transaction<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => ReturnType<T> {
    return (...args: Parameters<T>) => {
      this._db.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        this._db.run('COMMIT');
        this.save();
        return result;
      } catch (err) {
        try { this._db.run('ROLLBACK'); } catch (_) { /* already rolled back */ }
        throw err;
      }
    };
  }

  _exec(sql: string): QueryExecResult[] {
    return this._db.exec(sql);
  }

  save(): void {
    const data = this._db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dbPath, buffer);
  }

  close(): void {
    this._db.close();
  }
}

// ============================================================
// Public API
// ============================================================

export async function initDb(): Promise<Database> {
  SQL = await initSqlJs();
  const dbPath = path.resolve(config.dbPath);
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let sqlDb: SqlJsDatabase;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = new Database(sqlDb, dbPath);

  // Enable WAL-like settings
  db.exec('PRAGMA foreign_keys = ON');

  console.log(`[DB] Connected to SQLite at ${dbPath} (sql.js)`);

  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.save();
    db.close();
    db = null;
    console.log('[DB] Connection closed');
  }
}
