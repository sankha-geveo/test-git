const { success, error } = require("../Utils/Response.Helper");
const { QueryService } = require("../Services/Domain.Services/Query.Service");

class QueryController {
  constructor(ctx, dbPath) {
    this.ctx = ctx;
    this.dbPath = dbPath;
    this.svc = new QueryService(dbPath);
  }

  async handle(message) {
    try {
      const data = message.data || {};
      switch (message.Action) {
        case "getAsset":
          return success(await this.svc.getAsset(this.dbPath, data));
        case "listAssets":
          return success(await this.svc.listAssets(this.dbPath, data));
        case "getAssetHistory":
          return success(await this.svc.getAssetHistory(this.dbPath, data));
        case "getStats":
          return success(await this.svc.getStats(this.dbPath));
        default:
          return error(400, "Invalid action");
      }
    } catch (e) {
      return error(e.code || 500, e.message || "Error");
    }
  }
}

module.exports = { QueryController };
