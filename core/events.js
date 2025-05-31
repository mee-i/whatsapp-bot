const terminal = require('../utilities/terminal.js');
const colors = require('../utilities/colors.js');
const db = require('../utilities/database.js');

const { Command } = require('./commands.js')

const fs = require('node:fs');
const { Config, AutoFunction } = require('../config.js');

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
            const isGroup = data.key.remoteJid.includes('@g.us');
            const Log = (m) => { 
                terminal.Log(`[${colors.FgCyan}${isGroup ? "GC" : "PC"}${colors.FgGreen}][${data?.key?.remoteJid}][${data.pushName}]: ` + m);
            }
            const datafile = await db.Config.ReadConfig();
            const CommandOptions = datafile["CommandOptions"];  

            if (Config.ReadMessage)
                await sock.readMessages([data.key]);

            Object.keys(AutoFunction).forEach(async (key) => {
                if (data.status == "PENDING" || data.key.fromMe)
                    return data;
                await AutoFunction[key]({sock, msg: data, text: text || "", isGroup});
            });

            if (typeof text !== 'string') {
                Log(`${colors.FgRed}This message contains empty message, no handling will be done.`);
                return data;
            }

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
