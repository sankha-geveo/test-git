const HotPocket = require("hotpocket-js-client");
const bson = require("bson");
const nacl = require("tweetnacl");

class ContractService {
  constructor(servers, keyPair) {
    this.servers = servers;
    this.keyPair = keyPair;
    this.client = null;
    this.isConnected = false;
    this.promiseMap = new Map();
  }

  async init() {
    if (!this.keyPair) this.keyPair = await HotPocket.generateKeys();
    this.client = await HotPocket.createClient(this.servers, this.keyPair);

    this.client.on(HotPocket.events.disconnect, () => { this.isConnected = false; });
    this.client.on(HotPocket.events.contractOutput, (r) => {
      r.outputs.forEach((o) => {
        let out = null;
        try { out = JSON.parse(o); } catch (e) { try { out = bson.deserialize(o); } catch (e2) { out = null; } }
        if (!out) return;
        const pId = out.promiseId;
        if (pId && this.promiseMap.has(pId)) {
          const { resolve, reject } = this.promiseMap.get(pId);
          if (out.error) reject(out.error); else resolve(out.success || out);
          this.promiseMap.delete(pId);
        }
      });
    });

    if (!(await this.client.connect())) throw new Error("Connection failed");
    this.isConnected = true;
    return this.keyPair;
  }

  sign(buffer) {
    const sig = nacl.sign.detached(new Uint8Array(buffer), new Uint8Array(this.keyPair.privateKey));
    return Buffer.from(sig).toString("hex");
  }

  submitInput(obj) {
    const promiseId = Math.random().toString(16).slice(2);
    const payload = { promiseId, ...obj };
    const buf = Buffer.from(JSON.stringify(payload));
    this.client.submitContractInput(buf);
    return new Promise((resolve, reject) => {
      this.promiseMap.set(promiseId, { resolve, reject });
    });
  }
}

module.exports = { ContractService };
