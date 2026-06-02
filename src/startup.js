const HotPocket = require("hotpocket-nodejs-contract");
const bson = require("bson");
const { DBInitializer } = require("./Data.Deploy/initDB");
const { Controller } = require("./controller");
const settings = require("./settings.json").settings;

const contract = async (ctx) => {
  console.log("Sankha's Assets contract running");

  try { await DBInitializer.init(); } catch (e) { console.error("DB init error", e); }

  const controller = new Controller(ctx, settings.dbPath);

  for (const user of ctx.users.list()) {
    for (const input of user.inputs) {
      const buf = await ctx.users.read(input);
      let message = null;
      try { message = JSON.parse(buf); } catch (e) { try { message = bson.deserialize(buf); } catch (e2) { message = null; } }
      if (!message) { await user.send({ error: { code: 400, message: "Invalid input" } }); continue; }
      try {
        await controller.handle(user, message);
      } catch (e) {
        console.error("Handler error", e);
        await user.send({ error: { code: 500, message: "Server error" } });
      }
    }
  }
};

const hpc = new HotPocket.Contract();
hpc.init(contract, HotPocket.clientProtocols.JSON, true);
