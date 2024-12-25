const db = require('./database.js');

const baseXP = 100;

async function add({remoteJid, sock, msg}) {
    const userdata = await db.UserData.Read(remoteJid);
    userdata.xp += 25;

    let threshold = baseXP * Math.pow(userdata.level, 2);
    const initialLevel = userdata.level;

    while (userdata.xp >= threshold) {
        userdata.level++;
        threshold = baseXP * Math.pow(userdata.level, 2);
    }

    const nextLevelXP = baseXP * Math.pow(userdata.level + 1, 2) - userdata.xp;

    if (userdata.level > initialLevel) {
      await sock.sendMessage(msg.key.remoteJid, { text: `*LEVEL UP*
Hey @${userdata.name}, Level anda bertambah!
*${initialLevel}* > *${userdata.level}*

XP Anda saat ini: ${userdata.xp}
XP untuk level berikutnya: ${nextLevelXP}`, mentions: [`${remoteJid}`] });
    }

    await db.UserData.Modify(remoteJid, 'xp', userdata.xp);
    await db.UserData.Modify(remoteJid, 'level', userdata.level);

    
}

module.exports = {
  add
};
