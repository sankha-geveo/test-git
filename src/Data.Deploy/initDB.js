const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const settings = require("../settings.json").settings;

class DBInitializer {
  static async init() {
    const dbPath = settings.dbPath;
    const exists = fs.existsSync(dbPath);
    const db = new sqlite3.Database(dbPath);

    const run = (q) => new Promise((resolve, reject) => db.run(q, (e) => e ? reject(e) : resolve()));

    await run("PRAGMA foreign_keys = ON");

    await run(`CREATE TABLE IF NOT EXISTS ContractVersion (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Version FLOAT NOT NULL,
      Description TEXT,
      CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
      LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS ContractState (
      Id INTEGER PRIMARY KEY CHECK (Id = 1),
      Paused INTEGER DEFAULT 0
    )`);

    await run(`CREATE TABLE IF NOT EXISTS Roles (
      PubKey TEXT PRIMARY KEY,
      Role TEXT NOT NULL
    )`);

    await run(`CREATE TABLE IF NOT EXISTS Assets (
      Id TEXT PRIMARY KEY,
      Name TEXT NOT NULL,
      Description TEXT,
      MetadataUri TEXT,
      Location TEXT,
      Owner TEXT NOT NULL,
      Status TEXT NOT NULL,
      CreatedAt INTEGER,
      UpdatedAt INTEGER,
      IsFrozen INTEGER DEFAULT 0
    )`);

    await run(`CREATE TABLE IF NOT EXISTS AssetTags (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      AssetId TEXT NOT NULL,
      Tag TEXT NOT NULL,
      UNIQUE(AssetId, Tag),
      FOREIGN KEY(AssetId) REFERENCES Assets(Id) ON DELETE CASCADE
    )`);

    await run(`CREATE TABLE IF NOT EXISTS Events (
      Id TEXT PRIMARY KEY,
      AssetId TEXT NOT NULL,
      Type TEXT NOT NULL,
      Actor TEXT NOT NULL,
      DataJson TEXT,
      Timestamp INTEGER NOT NULL,
      FOREIGN KEY(AssetId) REFERENCES Assets(Id) ON DELETE CASCADE
    )`);

    // Seed ContractState row
    await run(`INSERT OR IGNORE INTO ContractState (Id, Paused) VALUES (1, 0)`);

    db.close();
  }
}

module.exports = { DBInitializer };
