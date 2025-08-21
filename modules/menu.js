const {
  FunctionCommand,
  FunctionDetails,
  MenuList,
  Config,
} = require("../config.js");

const db = require("../database");
const config_file = require("../utilities/database.js");
const xp = require("../utilities/xp.js");

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const extractParameters = (func) => {
  const fnStr = func.toString().replace(/\s+/g, ' ');
  const match = fnStr.match(/^[^\(]*\(\s*([^\)]*)\)/);
  return match?.[1] 
    ? match[1].split(',').map(param => param.trim()).slice(2)
    : [];
};

const formatDateTime = () => {
  const now = new Date();
  return `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()} ${
    String(now.getHours()).padStart(2, "0")}:${
    String(now.getMinutes()).padStart(2, "0")}:${
    String(now.getSeconds()).padStart(2, "0")}`;
};

const buildCommandString = (cmd, prefix) => {
  const params = extractParameters(FunctionCommand[cmd]);
  const paramString = params.map(p => ` <${p}>`).join('');
  const details = FunctionDetails[cmd];
  
  let description = '';
  if (details?.description) {
    const ownerTag = details.owneronly ? " (Owner only)" : "";
    const adminTag = details.admingroup ? " (GC admin)" : "";
    description = ` - _${details.description}_${ownerTag}${adminTag}`;
  }
  
  return ` *${prefix}${cmd}*${paramString}${description}`;
};

const generateMenu = (userData, commandOptions, pushName) => {
  const nextLevelXP = xp.getNextLevelXP(userData.level);
  const prefix = commandOptions["COMMAND-PREFIXES"][0];
  
  let menu = `*${Config.BotName} Menu!*
_Halo,_ *${pushName}*
XP Kamu: ${userData.xp}
Level Kamu: ${userData.level}
XP untuk level berikutnya: ${nextLevelXP}
Hari ini Tanggal: *${formatDateTime()}*
Prefix: ${commandOptions["COMMAND-PREFIXES"]}

Ketik /menu atau /help untuk menampilkan list menu!
List Menu:
`;

  Object.keys(MenuList)
    .sort()
    .forEach(menuName => {
      menu += `*[ ${menuName} ]*\n`;
      MenuList[menuName]
        .sort()
        .forEach(cmd => {
          menu += buildCommandString(cmd, prefix) + '\n';
        });
      menu += '\n';
    });

  return menu;
};

const menuHandler = async ({ sock, msg }) => {
  const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;
  
  const [datafile, userData] = await Promise.all([
    config_file.Config.ReadConfig(),
    db.sql.select().from(db.userTable).where(db.eq(db.userTable.id, remoteJid)).then(res => res[0])
  ]);

  const menu = generateMenu(userData, datafile["CommandOptions"], msg?.pushName);

  await sock.sendMessage(
    msg?.key?.remoteJid,
    {
      image: { url: "./media/MeeI-Bot.png" },
      caption: menu,
    },
    { quoted: msg }
  );
};

module.exports = {
  menu: menuHandler,
  help: menuHandler,
};