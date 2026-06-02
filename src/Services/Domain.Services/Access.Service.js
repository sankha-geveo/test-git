const { SqliteDatabase } = require("../Common.Services/dbHandler");

class AccessService {
  constructor(dbPath, actorPubKey) {
    this.db = new SqliteDatabase(dbPath);
    this.actor = (actorPubKey || "").toLowerCase();
  }

  async getRole(pubKey) {
    this.db.open();
    try {
      const rows = await this.db.getValues("Roles", { PubKey: (pubKey || "").toLowerCase() });
      return rows[0] ? rows[0].Role : null;
    } finally { this.db.close(); }
  }

  async assertAdmin(actorRole) {
    if (actorRole !== "ADMIN") throw { code: 403, message: "admin only" };
  }

  async registerUser(dbPath, ctxTs, actorRole, data) {
    await this.assertAdmin(actorRole);
    if (!data || !data.userPubKey || !data.role) throw { code: 400, message: "userPubKey and role required" };
    this.db.open();
    try {
      await this.db.insertValue("Roles", { PubKey: data.userPubKey.toLowerCase(), Role: data.role });
    } finally { this.db.close(); }
    return { event: { type: "RoleGranted", user: data.userPubKey, role: data.role } };
  }

  async grantRole(dbPath, ctxTs, actorRole, data) {
    await this.assertAdmin(actorRole);
    if (!data || !data.userPubKey || !data.role) throw { code: 400, message: "userPubKey and role required" };
    this.db.open();
    try {
      const exists = await this.db.getValues("Roles", { PubKey: data.userPubKey.toLowerCase() });
      if (exists.length === 0) await this.db.insertValue("Roles", { PubKey: data.userPubKey.toLowerCase(), Role: data.role });
      else await this.db.updateValue("Roles", { Role: data.role }, { PubKey: data.userPubKey.toLowerCase() });
    } finally { this.db.close(); }
    return { event: { type: "RoleGranted", user: data.userPubKey, role: data.role } };
  }

  async revokeRole(dbPath, ctxTs, actorRole, data) {
    await this.assertAdmin(actorRole);
    if (!data || !data.userPubKey) throw { code: 400, message: "userPubKey required" };
    this.db.open();
    try {
      await this.db.deleteValues("Roles", { PubKey: data.userPubKey.toLowerCase() });
    } finally { this.db.close(); }
    return { event: { type: "RoleRevoked", user: data.userPubKey } };
  }

  async pauseContract(dbPath, ctxTs, actorRole) {
    await this.assertAdmin(actorRole);
    this.db.open();
    try {
      await this.db.updateValue("ContractState", { Paused: 1 }, { Id: 1 });
    } finally { this.db.close(); }
    return { event: { type: "ContractPaused" } };
  }

  async unpauseContract(dbPath, ctxTs, actorRole) {
    await this.assertAdmin(actorRole);
    this.db.open();
    try {
      await this.db.updateValue("ContractState", { Paused: 0 }, { Id: 1 });
    } finally { this.db.close(); }
    return { event: { type: "ContractUnpaused" } };
  }
}

module.exports = { AccessService };
