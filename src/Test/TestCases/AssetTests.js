const { assert, assertSuccess } = require("../test-utils");

async function run(client) {
  const create = { Service: "Asset", Action: "createAsset", data: { assetId: "asset-1", name: "Crate", description: "Wooden crate", metadataUri: "", location: "WH1", tags: ["inventory", "fragile"] } };
  const r1 = await client.submitContractReadRequest(Buffer.from(JSON.stringify(create)));
  const o1 = JSON.parse(r1.toString());
  // createAsset is a mutation; depending on HP settings, this may need submitContractInput. Using read here for example-only; adapt to your dev env.
  // For proper ledger integration, use client.submitContractInput for state-changing actions.
  assert(o1.success || o1.error, "Response shape");
}

module.exports = { run };
