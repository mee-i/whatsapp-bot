const terminal = require('./utilities/terminal');
const colors = require('./utilities/colors');
const { Config } = require('../config');
const { Command } = require('./commands')
const fs = require('fs');

function hasPrefix(command, prefixes) {
    return prefixes.some(prefix => command.startsWith(prefix));
}

async function MessageEventsHandler(data, sock) {
    if (data.messages) {
        for (const datam of data?.messages) {
            if (Config.ReadMessage)
                await sock.readMessages([datam.key]);
            if (datam.key.remoteJid.search(`@s.whatsapp.net`) !== -1)
                await PrivateChatEventsHandler(datam, sock);
            else if (datam.key.remoteJid.search(`@g.us`) !== -1)
                await GroupEventsHandler(datam, sock);
            else
                terminal.WarnLog(`[WARNING]: ${colors.FgWhite}No handler for ${datam?.key?.remoteJid}, skipping.`);
        }
    }
    //terminal.Log(JSON.stringify(data, null, 2));
}
async function PrivateChatEventsHandler(data, sock) {
    //  terminal.WarnLog(JSON.stringify(data, null, 2));
    const Log = (m) => { 
        terminal.Log(`[${colors.FgCyan}PC${colors.FgGreen}][${data?.key?.remoteJid}][${data.pushName}]: ` + m);
    }

    if (data?.message?.extendedTextMessage) {
        const text = data?.message?.extendedTextMessage?.text;
        const datafile = fs.readFileSync("./cmd-config.json");
        const CommandOptions = JSON.parse(datafile);
        if (hasPrefix(text, CommandOptions["COMMAND-PREFIXES"])) {
            Log(`${colors.FgYellow}${text}`);
            await Command(text, false, sock, data?.key);
        } else
            Log(`${colors.FgWhite}${text}`);
    } else if (data?.message?.imageMessage) {
        Log(`Image + ${data?.message?.imageMessage?.caption}`)
    } else if (data?.message?.documentWithCaptionMessage) {
        Log(`Document + ${data?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption}`)
    }
}
async function GroupEventsHandler(data, sock) {
    const Metadata = await sock.groupMetadata(data?.key?.remoteJid);
    const GroupTitle = Metadata.subject;

    const Log = (m) => { 
        terminal.Log(`[${colors.FgBlue}GC${colors.FgGreen}][${GroupTitle}][${data.pushName}]: ` + m)
    }

    // Log(data?.message);
    if (data?.message?.extendedTextMessage) {
        const text = data?.message?.extendedTextMessage?.text;
        const datafile = fs.readFileSync("./cmd-config.json");
        const CommandOptions = JSON.parse(datafile);
        if (hasPrefix(text, CommandOptions["COMMAND-PREFIXES"])) {
            Log(`${colors.FgYellow}${text}`);
            await Command(text, false, sock, data?.key);
        } else
            Log(`${colors.FgWhite}${text}`);
    } else if (data?.message?.imageMessage) {
        Log(`Image + ${data?.message?.imageMessage?.caption}`)
    } else if (data?.message?.documentWithCaptionMessage) {
        Log(`Document + ${data?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption}`)
    }

    // if (isContains(data?.message, "imageMessage")) {
    //     Log(`Image + ${data?.message?.imageMessage?.caption}`);
    // }
    // if (isContains(data?.message, "documentWithCaptionMessage")) {
    //     Log(`Document + ${data?.message?.documentWithCaptionMessage?.message?.caption}`);
    // }
    // else {
    //     terminal.WarnLog(`[WARNING]: ${colors.FgWhite}No handler for ${data?.key?.remoteJid}, skipping.`);
    // }
    // Handle group-specific events here
}
module.exports = {
    MessageEventsHandler
};
