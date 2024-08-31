const terminal = require('./utilities/terminal');
const colors = require('./utilities/colors');
const Config = require('../config');

function isContains(json, value) {
    let contains = false;
    Object.keys(json).some(key => {
        contains = typeof json[key] === 'object' ? isContains(json[key], value) : json[key] === value;
         return contains;
    });
    return contains;
 }

async function MessageEventsHandler(data, sock) {
    if (data.messages) {
        var lastdata = null;
        for (const datam of data?.messages) {
            lastdata = datam;
            if (datam.key.remoteJid.search(`@s.whatsapp.net`) !== -1)
                await PrivateChatEventsHandler(datam, sock);
            else if (datam.key.remoteJid.search(`@g.us`) !== -1)
                await GroupEventsHandler(datam, sock);
            else
                terminal.WarnLog(`[WARNING]: ${colors.FgWhite}No handler for ${datam?.key?.remoteJid}, skipping.`);
        }
        if (Config.ReadMessage)
            await sock.readMessages(lastdata.key);
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
        Log(`${text}`);
        if (text == "ping") {
            const startTime = new Date(); // Start time
            await sock.sendMessage(data?.key?.remoteJid, { text: "pong" });
            const endTime = new Date(); // Start time
            const timeSpent = endTime - startTime; // Time in milliseconds
            await sock.sendMessage(data?.key?.remoteJid, { text: "response: " + timeSpent + " ms" });
        }
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
        Log(`${data?.message?.extendedTextMessage?.text}`);
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
