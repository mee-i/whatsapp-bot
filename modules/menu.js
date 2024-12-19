const {
  FunctionCommand,
  FunctionDetails,
  MenuList,
  Config,
} = require("../config.js");
const fs = require("fs");

function getParameterNames(fn) {
  const functionString = fn.toString();
  const result = functionString.match(/\(([^)]*)\)/);
  return result ? result[1].split(",").map((param) => param.trim()) : [];
}

module.exports = {
  menu: async (sock, msg) => {
    const datafile = fs.readFileSync("./cmd-config.json");
    const CommandOptions = JSON.parse(datafile);

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
    let menu = `*${Config.BotName} Menu!*
_Halo,_ *${msg?.pushName}*
${formattedDate}

Ketik /menu atau /help untuk menampilkan list menu!
List Menu:
`;
    console.log(FunctionDetails);
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
        image: { url: "./media/MeeI-Bot.png" },
        caption: menu,
      },
      { quoted: msg }
    );
  },
  help: async (sock, msg) => {
    return module.exports.menu(sock, msg);
  },
};
