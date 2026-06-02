const { SqliteDatabase } = require("../Common.Services/dbHandler");

class QueryService {
  constructor(dbPath) {
    this.db = new SqliteDatabase(dbPath);
  }

  encodeCursor(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64");
  }

  decodeCursor(cur) {
    try { return JSON.parse(Buffer.from(cur, "base64").toString("utf8")); } catch (e) { return null; }
  }

  async getAsset(dbPath, data) {
    if (!data || !data.assetId) throw { code: 400, message: "assetId required" };
    this.db.open();
    try {
      const rows = await this.db.getValues("Assets", { Id: data.assetId });
      if (rows.length === 0) throw { code: 404, message: "not found" };
      const a = rows[0];
      const tags = await this.db.getValues("AssetTags", { AssetId: data.assetId });
      const tagList = tags.map(t => t.Tag);
      return { asset: {
        id: a.Id,
        name: a.Name,
        description: a.Description,
        metadataUri: a.MetadataUri,
        location: a.Location,
        owner: a.Owner,
        status: a.Status,
        createdAt: a.CreatedAt,
        updatedAt: a.UpdatedAt,
        tags: tagList
      } };
    } finally { this.db.close(); }
  }

  async listAssets(dbPath, data) {
    const owner = data && data.owner ? data.owner.toLowerCase() : null;
    const status = data && data.status ? data.status : null;
    const tag = data && data.tag ? data.tag.toLowerCase() : null;
    const search = data && data.search ? data.search.toLowerCase() : null;
    const sortBy = (data && data.sortBy) || "createdAt";
    const sortDir = (data && data.sortDir) === "asc" ? "ASC" : "DESC";
    const limit = Math.max(1, Math.min(parseInt(data && data.limit ? data.limit : 20), 100));
    const cursor = data && data.cursor ? this.decodeCursor(data.cursor) : null;

    // Build query dynamically with stable sorting: primary sortBy, secondary by Id (for stability)
    let where = "WHERE 1";
    let params = [];
    if (owner) { where += " AND LOWER(Owner) = ?"; params.push(owner); }
    if (status) { where += " AND Status = ?"; params.push(status); }
    if (search) { where += " AND (LOWER(Name) LIKE ? OR LOWER(Description) LIKE ? OR LOWER(Location) LIKE ?)"; const t = `%${search}%`; params.push(t, t, t); }

    let baseQuery = `SELECT * FROM Assets ${where}`;

    // Tag filter requires join
    if (tag) {
      baseQuery = `SELECT a.* FROM Assets a JOIN AssetTags t ON a.Id = t.AssetId ${where.replace("FROM Assets", "") } AND LOWER(t.Tag) = ?`;
      params.push(tag);
    }

    // Apply cursor (after sort mapping)
    let sortCol = "CreatedAt";
    if (sortBy === "updatedAt") sortCol = "UpdatedAt";
    if (sortBy === "name") sortCol = "Name";

    let cursorClause = "";
    if (cursor && cursor.k !== undefined && cursor.id) {
      // For DESC: (sortVal < k) OR (sortVal = k AND Id < cursorId)
      // For ASC: (sortVal > k) OR (sortVal = k AND Id > cursorId)
      if (sortDir === "DESC") {
        cursorClause = ` AND ( ${sortCol} < ? OR (${sortCol} = ? AND Id < ?))`;
        params.push(cursor.k, cursor.k, cursor.id);
      } else {
        cursorClause = ` AND ( ${sortCol} > ? OR (${sortCol} = ? AND Id > ?))`;
        params.push(cursor.k, cursor.k, cursor.id);
      }
    }

    const orderClause = ` ORDER BY ${sortCol} ${sortDir}, Id ${sortDir}`;
    const final = `${baseQuery}${cursorClause}${orderClause} LIMIT ${limit}`;

    this.db.open();
    try {
      const rows = await this.db.runSelectQuery(final, params);
      const assets = [];
      for (const a of rows) {
        const tags = await this.db.getValues("AssetTags", { AssetId: a.Id });
        assets.push({
          id: a.Id,
          name: a.Name,
          description: a.Description,
          metadataUri: a.MetadataUri,
          location: a.Location,
          owner: a.Owner,
          status: a.Status,
          createdAt: a.CreatedAt,
          updatedAt: a.UpdatedAt,
          tags: tags.map(t => t.Tag)
        });
      }

      let nextCursor = null;
      if (rows.length === limit) {
        const last = rows[rows.length - 1];
        nextCursor = this.encodeCursor({ k: last[sortCol], id: last.Id });
      }
      return { data: assets, cursor: nextCursor };
    } finally { this.db.close(); }
  }

  async getAssetHistory(dbPath, data) {
    if (!data || !data.assetId) throw { code: 400, message: "assetId required" };
    const limit = Math.max(1, Math.min(parseInt(data && data.limit ? data.limit : 20), 100));
    const cursor = data && data.cursor ? this.decodeCursor(data.cursor) : null;

    let where = "WHERE AssetId = ?";
    let params = [data.assetId];
    if (cursor && cursor.ts && cursor.id) {
      where += " AND (Timestamp < ? OR (Timestamp = ? AND Id < ?))";
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    const q = `SELECT * FROM Events ${where} ORDER BY Timestamp DESC, Id DESC LIMIT ${limit}`;
    this.db.open();
    try {
      const rows = await this.db.runSelectQuery(q, params);
      let nextCursor = null;
      if (rows.length === limit) {
        const last = rows[rows.length - 1];
        nextCursor = this.encodeCursor({ ts: last.Timestamp, id: last.Id });
      }
      return { data: rows, cursor: nextCursor };
    } finally { this.db.close(); }
  }

  async getStats(dbPath) {
    this.db.open();
    try {
      const totalRows = await this.db.runSelectQuery("SELECT COUNT(*) AS c FROM Assets", []);
      const byStatus = await this.db.runSelectQuery("SELECT Status, COUNT(*) AS c FROM Assets GROUP BY Status", []);
      const topOwners = await this.db.runSelectQuery("SELECT Owner, COUNT(*) AS c FROM Assets GROUP BY Owner ORDER BY c DESC, Owner ASC LIMIT 10", []);
      const map = {};
      byStatus.forEach(r => { map[r.Status] = r.c; });
      return { totalAssets: totalRows[0] ? totalRows[0].c : 0, byStatus: map, topOwners };
    } finally { this.db.close(); }
  }
}

module.exports = { QueryService };
