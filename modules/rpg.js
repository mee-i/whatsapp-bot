const db = require("../database");
function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

async function daily({ sock, msg }) {
  const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;
  const UserData = await db.sql
    .select()
    .from(db.userTable)
    .where(db.eq(db.userTable.id, remoteJid))
    .then((res) => res[0]);

  if (UserData.daily_time) {
    const lastDailyTime = new Date(UserData.daily_time);
    const currentTime = new Date();
    const timeDifference = currentTime - lastDailyTime;
    const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));

    if (hoursDifference < 24) {
      const timeLeft = 24 - hoursDifference;
      const minutesDifference = Math.floor(
        (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
      );
      const secondsDifference = Math.floor(
        (timeDifference % (1000 * 60)) / 1000
      );
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: `Sorry, please wait again for ${timeLeft}h ${minutesDifference}m ${secondsDifference}s`,
        },
        { quoted: msg }
      );
    } else {
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "Daily money collected!" },
        { quoted: msg }
      );
      await db.sql.update(db.userTable).set({
        daily_time: new Date(),
        money: UserData.money + getRandomInt(50, 500),
      });
    }
  }
}

module.exports = {
  daily,
  Config: {
    details: {
      daily: {
        description: "Get random money daily!",
      },
    },
  },
};
