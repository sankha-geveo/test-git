const { connect } = require("./test-utils");
const { run: runAsset } = require("./TestCases/AssetTests");

(async () => {
  try {
    const { client } = await connect(["wss://localhost:8081", "ws://localhost:8081"]);
    await runAsset(client);
    console.log("Tests finished.");
    process.exit(0);
  } catch (e) {
    console.error("Tests failed:", e);
    process.exit(1);
  }
})();
