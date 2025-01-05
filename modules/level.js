const db = require("../utilities/database");
const xp = require("../utilities/xp");

module.exports = {
  level: async (sock, msg) => {
    const remoteJid = msg.key.participant ?? msg.key.remoteJid;
    const UserData = await db.UserData.Read(remoteJid);
    const nextLevelXP = xp.baseXP * Math.pow(UserData.level + 1, 2);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `*Level kamu*: ${UserData.level}
*XP kamu*: ${UserData.xp}
*Level Selanjutnya*: ${UserData.level + 1} (${nextLevelXP} xp)
Kamu membutuhkan *${nextLevelXP - UserData.xp}* xp lagi untuk naik level!`,});
  }
}