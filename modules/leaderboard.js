const db = require('../database');

module.exports = {
    leaderboard: async ({sock, msg}) => {
        const data = await db.sql.select().from(db.userTable);
        console.log(data);
        const sorted = Object.keys(data).sort((a, b) => data[b].xp - data[a].xp);
        console.log(sorted);
        const leaderboard = [];
        for (let i = 0; i < Math.min(sorted.length, 10); i++) {
            const user = data[sorted[i]];
            leaderboard.push(`${i + 1}. *${user.name}* - Level *${user.level}* - XP *${user.xp}*`);
        }
        await sock.sendMessage(msg?.key?.remoteJid, { text: `*Leaderboard MeeI Bot*
${leaderboard.join("\n")}` }, { quoted: msg });
    },
}