const { FunctionCommand, Config } = require('../config.js');

module.exports = {
    ping: async(sock, msg) => {
        const startTime = Date.now();
    
        await sock.sendMessage(msg?.key?.remoteJid, {text: "..."});
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        await sock.sendMessage(msg?.key?.remoteJid, {text: "Pong " + executionTime + " ms!"});
    },
    owner: async(sock, msg) => {
        const vcard = 'BEGIN:VCARD\n' // metadata of the contact card
                + 'VERSION:3.0\n' 
                + 'FN:Ilham\n' // full name
                + 'ORG:MeeI Bot Owner;\n' // the organization of the contact
                + 'TEL;type=CELL;type=VOICE;waid=6281220533069:+6281220533069\n' // WhatsApp ID + phone number
                + 'END:VCARD';
    
        await sock.sendMessage(
            msg?.key?.remoteJid,
            { 
                contacts: { 
                    displayName: 'Ilham', 
                    contacts: [{ vcard }] 
                }
            }
        );
    },
    totalmenu: async (sock, msg) => {
        let total = 0;
        Object.keys(FunctionCommand).forEach(key => {
            Object.keys(FunctionCommand[key]).forEach(cmd => {
                total++;
            });
        });
        await sock.sendMessage(msg?.key?.remoteJid, { text: "Total fitur saat ini adalah " + total });
    },
    bug: async (sock, msg, message) => {
        await sock.sendMessage(msg?.key?.remoteJid, { text: "Pesan telah dikirim kepada owner bot!" });
        await sock.sendMessage(`${Config.Owner}@s.whatsapp.net`, { text: `[BUG REPORT]
From: *${msg.pushName}*
Jid: *${msg.key.remoteJid}*
Pesan: _${message}_`});
    },
    report: async (a, b, c) => { return module.exports.bug(a, b, c); } ,
    Config: {
        menu: "Info"
    }
};