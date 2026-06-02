const sqlite3 = require("sqlite3").verbose();

const DataTypes = {
  TEXT: "TEXT",
  INTEGER: "INTEGER",
  NULL: "NULL"
};

class SqliteDatabase {
  constructor(dbFile) {
    this.dbFile = dbFile;
    this.openConnections = 0;
    this.db = null;
  }

  open() {
    if (this.openConnections <= 0) {
      this.db = new sqlite3.Database(this.dbFile);
      this.openConnections = 1;
    } else this.openConnections++;
  }

  close() {
    if (this.openConnections <= 1) {
      if (this.db) this.db.close();
      this.db = null;
      this.openConnections = 0;
    } else this.openConnections--;
  }

  runQuery(query, params) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params ? params : [], function (err) {
        if (err) return reject(err);
        resolve({ lastId: this.lastID, changes: this.changes });
      });
    });
  }

  runSelectQuery(query, params) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params ? params : [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  getValues(tableName, filter, op) {
    if (!this.db) throw "Database connection is not open.";

    let values = [];
    let filterStr = "1";
    if (filter) {
      const columnNames = Object.keys(filter);
      if (op === "IN") {
        for (const columnName of columnNames) {
          if (filter[columnName] && filter[columnName].length > 0) {
            const placeholders = filter[columnName].map(() => "?").join(", ");
            filterStr += ` AND ${columnName} IN (${placeholders})`;
            values.push(...filter[columnName]);
          }
        }
      } else {
        for (const columnName of columnNames) {
          filterStr += ` AND ${columnName} = ?`;
          values.push(filter[columnName]);
        }
      }
    }

    const query = `SELECT * FROM ${tableName} WHERE ${filterStr};`;
    return this.runSelectQuery(query, values);
  }

  async insertValue(tableName, value) {
    return this.insertValues(tableName, [value]);
  }

  async insertValues(tableName, values) {
    if (!this.db) throw "Database connection is not open.";
    if (!values || values.length === 0) return { lastId: 0, changes: 0 };

    const columnNames = Object.keys(values[0]);

    let rowValueStr = "";
    let rowValues = [];
    for (const val of values) {
      rowValueStr += "(";
      for (const columnName of columnNames) {
        rowValueStr += "?,";
        rowValues.push(val[columnName] !== undefined ? val[columnName] : null);
      }
      rowValueStr = rowValueStr.slice(0, -1) + "),";
    }
    rowValueStr = rowValueStr.slice(0, -1);

    const query = `INSERT INTO ${tableName}(${columnNames.join(", ")}) VALUES ${rowValueStr}`;
    return this.runQuery(query, rowValues);
  }

  async updateValue(tableName, value, filter) {
    if (!this.db) throw "Database connection is not open.";

    const columns = Object.keys(value);
    let setStr = columns.map(c => `${c} = ?`).join(", ");
    let params = columns.map(c => (value[c] !== undefined ? value[c] : null));

    let filterStr = "1";
    if (filter) {
      const fcols = Object.keys(filter);
      for (const c of fcols) {
        filterStr += ` AND ${c} = ?`;
        params.push(filter[c]);
      }
    }

    const query = `UPDATE ${tableName} SET ${setStr} WHERE ${filterStr};`;
    return this.runQuery(query, params);
  }

  async deleteValues(tableName, filter) {
    if (!this.db) throw "Database connection is not open.";

    let filterStr = "1";
    let params = [];
    if (filter) {
      const fcols = Object.keys(filter);
      for (const c of fcols) {
        filterStr += ` AND ${c} = ?`;
        params.push(filter[c]);
      }
    }

    const query = `DELETE FROM ${tableName} WHERE ${filterStr};`;
    return this.runQuery(query, params);
  }

  async getLastRecord(tableName) {
    const q = `SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT 1;`;
    const rows = await this.runSelectQuery(q, []);
    return rows[0];
  }

  async findById(tableName, id) {
    const q = `SELECT * FROM ${tableName} WHERE Id = ? LIMIT 1;`;
    const rows = await this.runSelectQuery(q, [id]);
    return rows[0];
  }
}

module.exports = { SqliteDatabase, DataTypes };
