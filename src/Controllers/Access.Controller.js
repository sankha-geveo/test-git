const { success, error } = require("../Utils/Response.Helper");
const { AccessService } = require("../Services/Domain.Services/Access.Service");

class AccessController {
  constructor(ctx, dbPath, actorPubKey, role) {
    this.ctx = ctx;
    this.dbPath = dbPath;
    this.actor = actorPubKey;
    this.role = role;
    this.svc = new AccessService(dbPath, actorPubKey);
  }

  async handle(message) {
    try {
      const data = message.data || {};
      let res;
      switch (message.Action) {
        case "registerUser":
          res = await this.svc.registerUser(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ ok: true }, [{ type: "RoleGranted", user: data.userPubKey, role: data.role }]);
        case "grantRole":
          res = await this.svc.grantRole(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ ok: true }, [{ type: "RoleGranted", user: data.userPubKey, role: data.role }]);
        case "revokeRole":
          res = await this.svc.revokeRole(this.dbPath, this.ctx.timestamp, this.role, data);
          return success({ ok: true }, [{ type: "RoleRevoked", user: data.userPubKey }]);
        case "pauseContract":
          res = await this.svc.pauseContract(this.dbPath, this.ctx.timestamp, this.role);
          return success({ paused: true }, [{ type: "ContractPaused" }]);
        case "unpauseContract":
          res = await this.svc.unpauseContract(this.dbPath, this.ctx.timestamp, this.role);
          return success({ paused: false }, [{ type: "ContractUnpaused" }]);
        default:
          return error(400, "Invalid action");
      }
    } catch (e) {
      return error(e.code || 500, e.message || "Error");
    }
  }
}

module.exports = { AccessController };
