const HotPocket = require("hotpocket-js-client");

async function connect(urls) {
  const kp = await HotPocket.generateKeys();
  const client = await HotPocket.createClient(urls, kp);
  if (!(await client.connect())) throw new Error("Connection failed");
  return { client, kp };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}

function assertSuccess(res) {
  if (!res || !res.success) throw new Error("Expected success response");
}

function assertError(res) {
  if (!res || !res.error) throw new Error("Expected error response");
}

module.exports = { connect, assert, assertSuccess, assertError };
