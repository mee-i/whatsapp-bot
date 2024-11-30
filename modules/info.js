async function ping(sock, key) {
    const startTime = Date.now();

    await sock.sendMessage(key?.remoteJid, {text: "..."});
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    await sock.sendMessage(key?.remoteJid, {text: "Pong " + executionTime + " ms!"});
}

async function owner(sock, key) {
    const vcard = 'BEGIN:VCARD\n' // metadata of the contact card
            + 'VERSION:3.0\n' 
            + 'FN:Ilham\n' // full name
            + 'ORG:MeeI Bot Owner;\n' // the organization of the contact
            + 'TEL;type=CELL;type=VOICE;waid=6281220533069:+6281220533069\n' // WhatsApp ID + phone number
            + 'END:VCARD';

    await sock.sendMessage(
        key?.remoteJid,
        { 
            contacts: { 
                displayName: 'Ilham', 
                contacts: [{ vcard }] 
            }
        }
    );
}

module.exports = {
    ping,
    owner,
    Config: {
        menu: "Utilities"
    }
};