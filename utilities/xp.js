
const db = require('../database');

const baseXP = 100;

function getXPForLevel(level) {
  return baseXP * Math.pow(level, 2);
}

function getNextLevelXP(level) {
  return getXPForLevel(level + 1);
}

async function add({ remoteJid, sock, msg }) {
  const [userdata] = await db.sql.select().from(db.userTable)
    .where(db.eq(db.userTable.id, remoteJid));

  userdata.xp += 25;

  let threshold = getNextLevelXP(userdata.level);

  if (userdata.xp >= threshold) {
    const initialLevel = userdata.level;
    userdata.level++;
    await sock.sendMessage(msg.key.remoteJid, {
      text: `*LEVEL UP*
Hey @${userdata.name}, Level anda bertambah!
*${initialLevel}* > *${userdata.level}*

XP Anda saat ini: ${userdata.xp}
XP untuk level berikutnya: ${getNextLevelXP(userdata.level)}`,
      mentions: [`${remoteJid}`]
    });
  }

  await db.sql.update(db.userTable)
    .set({
      xp: userdata.xp,
      level: userdata.level
    })
    .where(db.eq(db.userTable.id, remoteJid));
}


module.exports = {
  add, baseXP, getXPForLevel, getNextLevelXP,
};
