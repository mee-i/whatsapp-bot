const db = require("../utilities/database");

module.exports = {
  antilink: async ({sock, msg}) => {
    const IsAntilink = await db.Config.IsAntiLinkEnabled(msg.key.remoteJid);
    if (IsAntilink) {
      const data = await db.Config.ReadConfig();
      await db.Config.Modify("AntiLink", data["AntiLink"].filter((key) => key !== msg.key.remoteJid));
      await sock.sendMessage(msg.key.remoteJid, { text: "*AntiLink* telah dimatikan!" });
    } else {
      const data = await db.Config.ReadConfig();
      data["AntiLink"].push(msg.key.remoteJid);
      await db.Config.Modify("AntiLink", data["AntiLink"]);
      await sock.sendMessage(msg.key.remoteJid, { text: "*AntiLink* telah dinyalakan!" });
    }
  },
  Config: {
    menu: "Group",
    details: {
      antilink: {
        admingroup: true,
      },
    },
  }
}