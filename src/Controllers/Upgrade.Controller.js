const { success, error } = require("../Utils/Response.Helper");
const { UpgradeService } = require("../Services/Common.Services/Upgrade.Service");
const { verifyEd25519Signature } = require("../Utils/Crypto.Helper");

class UpgradeController {
  constructor(ctx, dbPath, actorPubKey) {
    this.ctx = ctx;
    this.dbPath = dbPath;
    this.actor = actorPubKey;
    this.svc = new UpgradeService(dbPath);
  }

  isMaintainer(userPubKeyHex) {
    const expected = (process.env.MAINTAINER_PUBKEY || "").toLowerCase();
    if (!expected) return false;
    return (userPubKeyHex || "").toLowerCase() === expected;
  }

  async handle(message) {
    try {
      if (message.Action !== "UpgradeContract") return error(400, "Invalid action");
      const data = message.data || {};
      if (!this.isMaintainer(this.actor)) return error(401, "Unauthorized");
      if (!data || !data.zipBase64 || !data.zipSignatureHex || !data.version) return error(400, "zipBase64, zipSignatureHex, version required");

      const zipBuf = Buffer.from(data.zipBase64, "base64");
      const ok = verifyEd25519Signature(zipBuf, data.zipSignatureHex, this.actor);
      if (!ok) return error(401, "Signature verification failed");

      const res = await this.svc.upgrade(zipBuf, parseFloat(data.version), data.description || "");
      return success(res, [{ type: "ContractUpgraded", version: data.version }]);
    } catch (e) {
      return error(e.code || 500, e.message || "Upgrade failed");
    }
  }
}

module.exports = { UpgradeController };
