const db = require("../utilities/database");

module.exports = {
  antilink: async ({sock, msg, text}) => {
    const AntiLink = await db.Config.IsAntiLinkEnabled(msg.key.remoteJid);
    // console.log("AntiLink: " + AntiLink);
    if (!AntiLink)
      return;
    if (text.match(/https?:\/\/[^\s]+/gi)) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Link tidak diizinkan disini!" }, {quoted: msg});
      // await sock.sendMessage(msg.key.remoteJid, { delete: msg.key.remoteJid});
    }
  }
}