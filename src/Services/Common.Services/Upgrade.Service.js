const fs = require("fs");
const { SqliteDatabase } = require("./dbHandler");
const settings = require("../../settings.json").settings;

class UpgradeService {
  constructor(dbPath) {
    this.db = new SqliteDatabase(dbPath);
  }

  async getCurrentVersion() {
    this.db.open();
    try {
      const row = await this.db.getLastRecord("ContractVersion");
      return row && row.Version ? row.Version : 1.0;
    } finally { this.db.close(); }
  }

  async saveVersion(version, description, ts) {
    this.db.open();
    try {
      await this.db.insertValue("ContractVersion", {
        Version: version,
        Description: description || null,
        CreatedOn: new Date(ts).toISOString(),
        LastUpdatedOn: new Date(ts).toISOString()
      });
    } finally { this.db.close(); }
  }

  async upgrade(zipBuffer, version, description) {
    const current = await this.getCurrentVersion();
    if (!(version > current)) throw { code: 403, message: "version must be greater than current" };

    fs.writeFileSync(settings.newContractZipFileName, zipBuffer);

    const post = `#!/bin/bash\
\
echo \"Running post_exec for Sankha's Assets\"\
\
! command -v unzip &>/dev/null && apt-get update && apt-get install --no-install-recommends -y unzip\
\
zip_file=\"${settings.newContractZipFileName}\"\
unzip -o -d ./ \"$zip_file\" >>/dev/null\
rm \"$zip_file\" >>/dev/null\
`;
    fs.writeFileSync(settings.postExecutionScriptName, post);
    fs.chmodSync(settings.postExecutionScriptName, 0o777);

    await this.saveVersion(version, description, Date.now());
    return { message: "Contract upgraded" };
  }
}

module.exports = { UpgradeService };
