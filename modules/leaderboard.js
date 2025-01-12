const db = require('../utilities/database');

module.exports = {
    leaderboard: async (sock, msg) => {
        const data = await db.ReadUserData();
        const sorted = Object.keys(data).sort((a, b) => data[b].xp - data[a].xp);
        const leaderboard = [];
        for (let i = 0; i < 10; i++) {
            const user = data[sorted[i]];
            leaderboard.push(`${i + 1}. *${user.name}* - Level *${user.level}* - XP *${user.xp}*`);
        }
        await sock.sendMessage(msg?.key?.remoteJid, { text: `*Leaderboard MeeI Bot*
${leaderboard.join("\n")}` }, { quoted: msg });
    },
}