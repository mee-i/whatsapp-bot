const terminal = require('../utilities/terminal.js');
const colors = require('../utilities/colors.js');

const { Command } = require('./commands.js')
const store = require('./memory-store.js');

const fs = require('node:fs');
const { Config } = require('../config.js');
function hasPrefix(command, prefixes) {
    return prefixes.some(prefix => command.startsWith(prefix));
}

async function MessageEventsHandler(rawdata, sock) {
    if (rawdata.messages) {
        for (const data of rawdata?.messages) {
            const text = (data?.message?.extendedTextMessage) ? data?.message?.extendedTextMessage?.text : (
                data?.message?.conversation ?
                    data?.message?.conversation
                : (
                    data?.message?.imageMessage ?
                        data?.message?.imageMessage?.caption
                    : (
                        data?.message?.documentWithCaptionMessage ?
                            data?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption
                        : (
                            ""
                        )
                    )
                )
            )
            const Log = (m) => { 
                terminal.Log(`[${colors.FgCyan}PC${colors.FgGreen}][${data?.key?.remoteJid}][${data.pushName}]: ` + m);
            }
            const datafile = fs.readFileSync("./cmd-config.json");
            const CommandOptions = JSON.parse(datafile);
            if (Config.ReadMessage)
                await sock.readMessages([data.key]);
            const isGroup = (data.key.remoteJid.search(`@s.whatsapp.net`) !== -1);
            if (hasPrefix(text, CommandOptions["COMMAND-PREFIXES"])) {
                Log(`${colors.FgYellow}${text}`);
                if (data.status == "PENDING" || data.key.fromMe)
                    return data;
                await Command(text, isGroup, sock, data);
            } else {
                Log(`${colors.FgWhite}${text}`);
            }
        }
    }
}

module.exports = {
    MessageEventsHandler
};
