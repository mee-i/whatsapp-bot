const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const makeWASocket = require('@whiskeysockets/baileys').default;
const WAEvents = require('./modules/events');

async function WhatsappEvent() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true,
        auth: state
    });
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update || {};
        if (qr) {
            console.log(qr);
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Reconnecting...');
                await WhatsappEvent(); // Ensure to wait for reconnection
            }
        }
    });

    sock.ev.on('messages.upsert', (m) => {
        WAEvents.MessageEventsHandler(m, sock); // No need to stringify here
    });

    sock.ev.on('message.update', (message) => {
        console.log('Received message:', message?.toString());
    });

    sock.ev.on('creds.update', saveCreds);
}

WhatsappEvent();
