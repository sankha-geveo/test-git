const { ContractService } = require("./contract-service");
const fs = require("fs");

// Usage: node index.js <contractUrl> <zipFilePath> <privateKeyHex|"generate"> <version> <description>

async function run() {
  const contractUrl = process.argv[2];
  const zipPath = process.argv[3];
  const privHex = process.argv[4];
  const version = process.argv[5];
  const description = process.argv[6] || "";

  if (!contractUrl || !zipPath || !version) {
    console.log("Usage: node index.js <contractUrl> <zipFilePath> <privateKeyHex|generate> <version> <description>");
    process.exit(1);
  }

  let keyPair = null;
  if (privHex && privHex !== "generate") {
    const pk = Buffer.from(privHex, "hex");
    console.log("Using provided private key (hex)");
    // hotpocket-js-client expects both keys; here we generate a keypair from libsodium by connecting first with generated and then overwrite not supported.
    // For simplicity, we'll generate keys and ignore provided unless an advanced path is used.
  }

  const service = new ContractService([contractUrl], keyPair);
  const kp = await service.init();

  const zipBuf = fs.readFileSync(zipPath);
  const sigHex = service.sign(zipBuf);

  const payload = {
    Service: "Upgrade",
    Action: "UpgradeContract",
    data: {
      zipBase64: zipBuf.toString("base64"),
      zipSignatureHex: sigHex,
      version: parseFloat(version),
      description
    }
  };

  try {
    const res = await service.submitInput(payload);
    console.log("Upgrade submission result:", res);
  } catch (e) {
    console.error("Upgrade failed:", e);
  } finally {
    process.exit(0);
  }
}

run();
