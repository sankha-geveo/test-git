const { success, error } = require("../Utils/Response.Helper");
const { AssetService } = require("../Services/Domain.Services/Asset.Service");
const { SqliteDatabase } = require("../Services/Common.Services/dbHandler");

class AssetController {
  constructor(ctx, dbPath, actorPubKey, role) {
    this.ctx = ctx;
    this.dbPath = dbPath;
    this.actor = actorPubKey;
    this.role = role;
    this.svc = new AssetService(dbPath, actorPubKey);
  }

  async handle(message) {
    try {
      const data = message.data || {};
      let res;
      switch (message.Action) {
        case "createAsset":
          res = await this.svc.createAsset(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ assetId: data.assetId }, res.events);
        case "updateAsset":
          res = await this.svc.updateAsset(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ updated: true }, res.events);
        case "transferAsset":
          res = await this.svc.transferAsset(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ transferred: true }, res.events);
        case "setStatus":
          res = await this.svc.setStatus(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ status: data.newStatus }, res.events);
        case "addTag":
          res = await this.svc.addTag(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ tagAdded: true }, res.events);
        case "removeTag":
          res = await this.svc.removeTag(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ tagRemoved: true }, res.events);
        case "recordCustomEvent":
          res = await this.svc.recordCustomEvent(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ recorded: true }, res.events);
        case "freezeAsset":
          res = await this.svc.freezeAsset(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ frozen: true }, res.events);
        case "unfreezeAsset":
          res = await this.svc.unfreezeAsset(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ frozen: false }, res.events);
        default:
          return error(400, "Invalid action");
      }
    } catch (e) {
      return error(e.code || 500, e.message || "Error");
    }
  }
}

module.exports = { AssetController };
