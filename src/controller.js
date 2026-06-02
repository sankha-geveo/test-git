const { SqliteDatabase } = require("./Services/Common.Services/dbHandler");
const { AssetController } = require("./Controllers/Asset.Controller");
const { AccessController } = require("./Controllers/Access.Controller");
const { QueryController } = require("./Controllers/Query.Controller");
const { UpgradeController } = require("./Controllers/Upgrade.Controller");

class Controller {
  constructor(ctx, dbPath) {
    this.ctx = ctx;
    this.dbPath = dbPath;
  }

  async getRole(pubKey) {
    const db = new SqliteDatabase(this.dbPath);
    db.open();
    try {
      const rows = await db.getValues("Roles", { PubKey: (pubKey || "").toLowerCase() });
      return rows[0] ? rows[0].Role : null;
    } finally { db.close(); }
  }

  async handle(user, message) {
    const actor = user.pubKey ? user.pubKey : null;
    const role = await this.getRole(actor);

    let svcName = message.Service || message.service || "";
    const action = message.Action;

    let response;
    if (svcName === "Asset") {
      const ctrl = new AssetController(this.ctx, this.dbPath, actor, role);
      response = await ctrl.handle(message);
    } else if (svcName === "Access") {
      const ctrl = new AccessController(this.ctx, this.dbPath, actor, role);
      response = await ctrl.handle(message);
    } else if (svcName === "Query") {
      const ctrl = new QueryController(this.ctx, this.dbPath);
      response = await ctrl.handle(message);
    } else if (svcName === "Upgrade") {
      const ctrl = new UpgradeController(this.ctx, this.dbPath, actor);
      response = await ctrl.handle(message);
    } else {
      response = { error: { code: 400, message: "Invalid service" } };
    }

    await user.send(response);
  }
}

module.exports = { Controller };
