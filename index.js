const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const makeWASocket = require('@whiskeysockets/baileys').default;
const WAEvents = require('./modules/events');
const figlet = require('figlet');
const colors = require('./modules/utilities/colors');
const { FunctionCommand } = require('./config');
const fs = require('fs')
const path = require('path');
const Terminal = require('./modules/utilities/terminal');
const { Worker } = require('worker_threads');

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

    sock.ev.on('messages.upsert', async (m) => {
        try {
            await WAEvents.MessageEventsHandler(m, sock); // No need to stringify here
        } catch (e) {
            Terminal.ErrorLog(e);
        }
    });

    sock.ev.on('message.update', (message) => {
        console.log('Received message:', message?.toString());
    });

    sock.ev.on('creds.update', saveCreds);
}

figlet("MeeI-Bot", (err, data) => {
    if (err) {
        console.error('Something went wrong...');
        console.dir(err);
        return;
    }
    console.log(colors.FgGreen + data + colors.Reset);
});

fs.readdir("./modules/lib/", (err, files) => {
    if (err) {
        console.error('Error reading the directory:', err);
        return;
    }

    // Menjalankan setiap file JavaScript
    files.forEach(file => {
        const filePath = "./modules/lib/" + file;
        if (path.extname(file) === '.js') {
            console.log('Loading ${filePath}');
            const lib = require(filePath);
            Object.keys(lib).forEach(key => {
                FunctionCommand[key] = lib[key];
            });
        }
    });
});

WhatsappEvent();
