const terminal = require('../utilities/terminal.js');
const colors = require('../utilities/colors.js');
const db = require('../utilities/database.js');
const { Command } = require('./commands.js');
const { Config, AutoFunction } = require('../config.js');

const extractMessageText = (message) => {
    return message?.extendedTextMessage?.text ||
           message?.conversation ||
           message?.imageMessage?.caption ||
           message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
           "";
};

const createLogger = (isGroup, remoteJid, pushName) => {
    const prefix = `[${colors.FgCyan}${isGroup ? "GC" : "PC"}${colors.FgGreen}][${remoteJid}][${pushName}]: `;
    return (message) => terminal.Log(prefix + message);
};

const shouldSkipProcessing = (data) => data.status === "PENDING" || data.key.fromMe;

const processAutoFunctions = async (data, text, isGroup, sock) => {
    const promises = Object.values(AutoFunction).map(fn => 
        fn({ sock, msg: data, text, isGroup })
    );
    await Promise.all(promises);
};

const hasPrefix = (command, prefixes) => 
    prefixes.some(prefix => command.startsWith(prefix));

async function MessageEventsHandler(rawdata, sock) {
    if (!rawdata.messages) return;

    const { "CommandOptions": commandOptions } = await db.Config.ReadConfig();

    await Promise.all(rawdata.messages.map(async (data) => {
        const text = extractMessageText(data.message);
        const isGroup = data.key.remoteJid.includes('@g.us');
        const log = createLogger(isGroup, data.key.remoteJid, data.pushName);

        if (Config.ReadMessage) {
            await sock.readMessages([data.key]);
        }

        if (shouldSkipProcessing(data)) return;

        await processAutoFunctions(data, text, isGroup, sock);

        if (typeof text !== 'string') {
            log(`${colors.FgRed}This message contains empty message, no handling will be done.`);
            return;
        }

        if (hasPrefix(text, commandOptions["COMMAND-PREFIXES"])) {
            log(`${colors.FgYellow}${text}`);
            await Command(text, isGroup, sock, data);
        } else {
            log(`${colors.FgWhite}${text}`);
        }
    }));
}

module.exports = { MessageEventsHandler };