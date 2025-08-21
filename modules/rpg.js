const db = require("../database");

function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

async function daily({ sock, msg }) {
  try {
    const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;
    
    // Get user data
    const UserData = await db.sql
      .select()
      .from(db.userTable)
      .where(db.eq(db.userTable.id, remoteJid))
      .then((res) => res[0]);

    // Check if user exists
    if (!UserData) {
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "User not found. Please register first." },
        { quoted: msg }
      );
      return;
    }

    const currentTime = new Date();

    // If user has never claimed daily before
    if (!UserData.daily_time) {
      const randomMoney = getRandomInt(50, 500);
      
      await db.sql
        .update(db.userTable)
        .set({
          daily_time: currentTime,
          money: UserData.money + randomMoney,
        })
        .where(db.eq(db.userTable.id, remoteJid));

      await sock.sendMessage(
        msg.key.remoteJid,
        { text: `Daily money collected! You received $${randomMoney}` },
        { quoted: msg }
      );
      return;
    }

    // Calculate time difference
    const lastDailyTime = new Date(UserData.daily_time);
    const timeDifference = currentTime - lastDailyTime;
    const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));

    // Check if 24 hours have passed
    if (hoursDifference < 24) {
      const hoursLeft = 23 - hoursDifference;
      const minutesLeft = 59 - Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = 59 - Math.floor((timeDifference % (1000 * 60)) / 1000);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: `Sorry, please wait again for ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`,
        },
        { quoted: msg }
      );
    } else {
      // Award daily money
      const randomMoney = getRandomInt(50, 500);
      
      await db.sql
        .update(db.userTable)
        .set({
          daily_time: currentTime,
          money: UserData.money + randomMoney,
        })
        .where(db.eq(db.userTable.id, remoteJid));

      await sock.sendMessage(
        msg.key.remoteJid,
        { text: `Daily money collected! You received $${randomMoney}` },
        { quoted: msg }
      );
    }
  } catch (error) {
    console.error("Daily command error:", error);
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: "An error occurred while processing your daily reward." },
      { quoted: msg }
    );
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