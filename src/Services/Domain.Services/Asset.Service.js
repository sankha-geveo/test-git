const { v4: uuidv4 } = require("uuid");
const { SqliteDatabase } = require("../Common.Services/dbHandler");
const { StatusEnum, EventTypeEnum, Config } = require("../../Constants/constants");

class AssetService {
  constructor(dbPath, actorPubKey) {
    this.db = new SqliteDatabase(dbPath);
    this.actor = actorPubKey;
  }

  normalizeTag(tag) {
    return (tag || "").toString().trim().toLowerCase();
  }

  nowTs(ctxTs) {
    return ctxTs || Date.now();
  }

  async getRole(dbPath, pubkey) {
    this.db.open();
    try {
      const rows = await this.db.getValues("Roles", { PubKey: (pubkey || "").toLowerCase() });
      return rows[0] ? rows[0].Role : null;
    } finally { this.db.close(); }
  }

  async isPaused() {
    this.db.open();
    try {
      const rows = await this.db.getValues("ContractState", { Id: 1 });
      return rows[0] && rows[0].Paused === 1;
    } finally { this.db.close(); }
  }

  async assertNotPausedOrAdmin(ctxTs, actorRole) {
    const paused = await this.isPaused();
    if (paused && actorRole !== "ADMIN") throw { code: 403, message: "Contract is paused" };
  }

  async loadAsset(assetId) {
    this.db.open();
    try {
      const rows = await this.db.getValues("Assets", { Id: assetId });
      return rows[0];
    } finally { this.db.close(); }
  }

  async getTags(assetId) {
    this.db.open();
    try {
      const rows = await this.db.getValues("AssetTags", { AssetId: assetId });
      return rows.map(r => r.Tag);
    } finally { this.db.close(); }
  }

  async putEvent(assetId, type, dataJson, ctxTs) {
    this.db.open();
    try {
      const ev = {
        Id: uuidv4(),
        AssetId: assetId,
        Type: type,
        Actor: (this.actor || "").toLowerCase(),
        DataJson: dataJson || null,
        Timestamp: this.nowTs(ctxTs)
      };
      await this.db.insertValue("Events", ev);
      return ev;
    } finally { this.db.close(); }
  }

  async createAsset(dbPath, ctxTs, role, data) {
    await this.assertNotPausedOrAdmin(ctxTs, role);
    if (!data || !data.assetId) throw { code: 400, message: "assetId required" };
    if (!data.name || data.name.trim().length === 0) throw { code: 400, message: "name required" };
    if (data.name.length > Config.maxNameLength) throw { code: 400, message: "name too long" };

    this.db.open();
    try {
      const exists = await this.db.getValues("Assets", { Id: data.assetId });
      if (exists.length > 0) throw { code: 409, message: "assetId already exists" };

      const ts = this.nowTs(ctxTs);
      const asset = {
        Id: data.assetId,
        Name: data.name,
        Description: data.description || null,
        MetadataUri: data.metadataUri || null,
        Location: data.location || null,
        Owner: (this.actor || "").toLowerCase(),
        Status: StatusEnum.ACTIVE,
        CreatedAt: ts,
        UpdatedAt: ts,
        IsFrozen: 0
      };
      await this.db.insertValue("Assets", asset);

      const tags = Array.isArray(data.tags) ? data.tags.map(t => this.normalizeTag(t)).filter(t => t) : [];
      if (tags.length > Config.maxTagsPerAsset) throw { code: 400, message: "too many tags" };
      for (const t of tags) {
        await this.db.insertValue("AssetTags", { AssetId: asset.Id, Tag: t });
      }
    } finally { this.db.close(); }

    const ev = await this.putEvent(data.assetId, EventTypeEnum.CREATED, JSON.stringify({ name: data.name }), ctxTs);
    return { events: [ev], assetId: data.assetId };
  }

  async updateAsset(dbPath, ctxTs, role, data) {
    await this.assertNotPausedOrAdmin(ctxTs, role);
    if (!data || !data.assetId) throw { code: 400, message: "assetId required" };
    const a = await this.loadAsset(data.assetId);
    if (!a) throw { code: 404, message: "asset not found" };
    if (a.IsFrozen === 1 && role !== "ADMIN") throw { code: 403, message: "asset frozen" };
    if (role !== "ADMIN" && a.Owner !== (this.actor || "").toLowerCase()) throw { code: 403, message: "not owner" };

    const patch = {};
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) throw { code: 400, message: "name required" };
      if (data.name.length > Config.maxNameLength) throw { code: 400, message: "name too long" };
      patch.Name = data.name;
    }
    if (data.description !== undefined) patch.Description = data.description;
    if (data.metadataUri !== undefined) patch.MetadataUri = data.metadataUri;
    if (data.location !== undefined) patch.Location = data.location;
    patch.UpdatedAt = this.nowTs(ctxTs);

    this.db.open();
    try {
      await this.db.updateValue("Assets", patch, { Id: data.assetId });
    } finally { this.db.close(); }

    const ev = await this.putEvent(data.assetId, EventTypeEnum.UPDATED, JSON.stringify({ patch: Object.keys(patch) }), ctxTs);
    return { events: [ev] };
  }

  async transferAsset(dbPath, ctxTs, role, data) {
    await this.assertNotPausedOrAdmin(ctxTs, role);
    if (!data || !data.assetId || !data.newOwner) throw { code: 400, message: "assetId and newOwner required" };
    const a = await this.loadAsset(data.assetId);
    if (!a) throw { code: 404, message: "asset not found" };
    if (a.IsFrozen === 1 && role !== "ADMIN") throw { code: 403, message: "asset frozen" };
    if (role !== "ADMIN" && a.Owner !== (this.actor || "").toLowerCase()) throw { code: 403, message: "not owner" };

    this.db.open();
    try {
      await this.db.updateValue("Assets", { Owner: data.newOwner.toLowerCase(), UpdatedAt: this.nowTs(ctxTs) }, { Id: data.assetId });
    } finally { this.db.close(); }

    const ev = await this.putEvent(data.assetId, EventTypeEnum.TRANSFERRED, JSON.stringify({ to: data.newOwner, note: data.note || null }), ctxTs);
    return { events: [ev] };
  }

  async setStatus(dbPath, ctxTs, role, data) {
    await this.assertNotPausedOrAdmin(ctxTs, role);
    if (!data || !data.assetId || !data.newStatus) throw { code: 400, message: "assetId and newStatus required" };
    const valid = Object.values(StatusEnum).includes(data.newStatus);
    if (!valid) throw { code: 400, message: "invalid status" };
    const a = await this.loadAsset(data.assetId);
    if (!a) throw { code: 404, message: "asset not found" };
    if (a.IsFrozen === 1 && role !== "ADMIN") throw { code: 403, message: "asset frozen" };
    if (role !== "ADMIN" && a.Owner !== (this.actor || "").toLowerCase()) throw { code: 403, message: "not owner" };

    this.db.open();
    try {
      await this.db.updateValue("Assets", { Status: data.newStatus, UpdatedAt: this.nowTs(ctxTs) }, { Id: data.assetId });
    } finally { this.db.close(); }

    const ev = await this.putEvent(data.assetId, EventTypeEnum.STATUS_CHANGED, JSON.stringify({ status: data.newStatus }), ctxTs);
    return { events: [ev] };
  }

  async addTag(dbPath, ctxTs, role, data) {
    await this.assertNotPausedOrAdmin(ctxTs, role);
    if (!data || !data.assetId || !data.tag) throw { code: 400, message: "assetId and tag required" };
    const a = await this.loadAsset(data.assetId);
    if (!a) throw { code: 404, message: "asset not found" };
    if (a.IsFrozen === 1 && role !== "ADMIN") throw { code: 403, message: "asset frozen" };
    if (role !== "ADMIN" && a.Owner !== (this.actor || "").toLowerCase()) throw { code: 403, message: "not owner" };

    const t = this.normalizeTag(data.tag);
    this.db.open();
    try {
      const current = await this.db.getValues("AssetTags", { AssetId: data.assetId });
      if (current.length >= Config.maxTagsPerAsset) throw { code: 400, message: "too many tags" };
      await this.db.insertValue("AssetTags", { AssetId: data.assetId, Tag: t });
      await this.db.updateValue("Assets", { UpdatedAt: this.nowTs(ctxTs) }, { Id: data.assetId });
    } finally { this.db.close(); }

    const ev = await this.putEvent(data.assetId, EventTypeEnum.TAG_ADDED, JSON.stringify({ tag: t }), ctxTs);
    return { events: [ev] };
  }

  async removeTag(dbPath, ctxTs, role, data) {
    await this.assertNotPausedOrAdmin(ctxTs, role);
    if (!data || !data.assetId || !data.tag) throw { code: 400, message: "assetId and tag required" };
    const a = await this.loadAsset(data.assetId);
    if (!a) throw { code: 404, message: "asset not found" };
    if (a.IsFrozen === 1 && role !== "ADMIN") throw { code: 403, message: "asset frozen" };
    if (role !== "ADMIN" && a.Owner !== (this.actor || "").toLowerCase()) throw { code: 403, message: "not owner" };

    const t = this.normalizeTag(data.tag);
    this.db.open();
    try {
      await this.db.deleteValues("AssetTags", { AssetId: data.assetId, Tag: t });
      await this.db.updateValue("Assets", { UpdatedAt: this.nowTs(ctxTs) }, { Id: data.assetId });
    } finally { this.db.close(); }

    const ev = await this.putEvent(data.assetId, EventTypeEnum.TAG_REMOVED, JSON.stringify({ tag: t }), ctxTs);
    return { events: [ev] };
  }

  async recordCustomEvent(dbPath, ctxTs, role, data) {
    await this.assertNotPausedOrAdmin(ctxTs, role);
    if (!data || !data.assetId || !data.customType) throw { code: 400, message: "assetId and customType required" };
    const a = await this.loadAsset(data.assetId);
    if (!a) throw { code: 404, message: "asset not found" };
    if (a.IsFrozen === 1 && role !== "ADMIN") throw { code: 403, message: "asset frozen" };
    if (role !== "ADMIN" && a.Owner !== (this.actor || "").toLowerCase()) throw { code: 403, message: "not owner" };

    const ev = await this.putEvent(data.assetId, EventTypeEnum.CUSTOM, JSON.stringify({ type: data.customType, data: data.dataJson || null }), ctxTs);
    return { events: [ev] };
  }

  async freezeAsset(dbPath, ctxTs, role, data) {
    await this.assertNotPausedOrAdmin(ctxTs, role);
    if (role !== "ADMIN") throw { code: 403, message: "admin only" };
    if (!data || !data.assetId) throw { code: 400, message: "assetId required" };
    const a = await this.loadAsset(data.assetId);
    if (!a) throw { code: 404, message: "asset not found" };

    this.db.open();
    try {
      await this.db.updateValue("Assets", { IsFrozen: 1, Status: StatusEnum.FROZEN, UpdatedAt: this.nowTs(ctxTs) }, { Id: data.assetId });
    } finally { this.db.close(); }

    const ev = await this.putEvent(data.assetId, EventTypeEnum.STATUS_CHANGED, JSON.stringify({ status: StatusEnum.FROZEN }), ctxTs);
    const ev2 = await this.putEvent(data.assetId, "ASSET_FROZEN", JSON.stringify({ frozen: true }), ctxTs);
    return { events: [ev, ev2] };
  }

  async unfreezeAsset(dbPath, ctxTs, role, data) {
    await this.assertNotPausedOrAdmin(ctxTs, role);
    if (role !== "ADMIN") throw { code: 403, message: "admin only" };
    if (!data || !data.assetId) throw { code: 400, message: "assetId required" };
    const a = await this.loadAsset(data.assetId);
    if (!a) throw { code: 404, message: "asset not found" };

    this.db.open();
    try {
      await this.db.updateValue("Assets", { IsFrozen: 0, Status: StatusEnum.ACTIVE, UpdatedAt: this.nowTs(ctxTs) }, { Id: data.assetId });
    } finally { this.db.close(); }

    const ev = await this.putEvent(data.assetId, EventTypeEnum.STATUS_CHANGED, JSON.stringify({ status: StatusEnum.ACTIVE }), ctxTs);
    const ev2 = await this.putEvent(data.assetId, "ASSET_UNFROZEN", JSON.stringify({ frozen: false }), ctxTs);
    return { events: [ev, ev2] };
  }
}

module.exports = { AssetService };
