const {
  FunctionCommand,
  FunctionDetails,
  MenuList,
  Config,
} = require("../config.js");

const db = require("../utilities/database.js");

function getParameterNames(func) {
  const fnStr = func.toString().replace(/\s+/g, ' ');
  const result = fnStr.match(/^[^\(]*\(\s*([^\)]*)\)/);
  return result && result[1]
    ? result[1].split(',').map(param => param.trim())
    : [];
}

module.exports = {
  menu: async ({sock, msg}) => {
    const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;
    const datafile = await db.Config.ReadConfig();
    const UserData = await db.UserData.Read(remoteJid);
    const CommandOptions = datafile["CommandOptions"];

    const now = new Date();
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const formattedDate = `${now.getDate()} ${
      months[now.getMonth()]
    } ${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    const nextLevelXP = 100 * Math.pow(UserData.level + 1, 2) - UserData.xp;
    let menu = `*${Config.BotName} Menu!*
_Halo,_ *${msg?.pushName}*
XP Kamu: ${UserData.xp}
Level Kamu: ${UserData.level}
XP untuk level berikutnya: ${nextLevelXP}
Hari ini Tanggal: *${formattedDate}*
Prefix: ${CommandOptions["COMMAND-PREFIXES"]}

Ketik /menu atau /help untuk menampilkan list menu!
List Menu:
`;
    Object.keys(MenuList)
      .sort()
      .forEach((mname) => {
        menu += `*[ ${mname} ]*\n`;
        MenuList[mname].sort().forEach((cmd) => {
          menu += ` *${CommandOptions["COMMAND-PREFIXES"][0]}${cmd}*`;
          const Params = getParameterNames(FunctionCommand[cmd]);
          Params.shift();
          Params.shift();
          Params.forEach((element) => {
            menu += ` <${element}>`;
          });
          if (FunctionDetails[cmd]) {
            if (FunctionDetails[cmd].description) {
              menu += ` - _${FunctionDetails[cmd].description}_ ${
                FunctionDetails[cmd].owneronly ? "(Owner only)" : ""
              } ${FunctionDetails[cmd].admingroup ? "(GC admin)" : ""}`;
            }
          }
          menu += "\n";
        });
        menu += "\n";
      });
    await sock.sendMessage(
      msg?.key?.remoteJid,
      {
        video: { url: "./media/MeeI-Watsapp-Bot.gif" },
        caption: menu,
        gifPlayback: true
      },
      { quoted: msg }
    );
  },
  help: async (data) => {
    return module.exports.menu(data);
  },
};
