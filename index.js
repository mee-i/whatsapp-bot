const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const makeWASocket = require('@whiskeysockets/baileys').default;
const WAEvents = require('./modules/events');
const figlet = require('figlet');
const colors = require('./modules/utilities/colors');
const { FunctionCommand } = require('./config');
const fs = require('fs')
const path = require('path');
const Terminal = require('./modules/utilities/terminal');

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
            console.log("Loading %s", filePath);
            const lib = require(filePath);
            let MenuName = "";
            let disableMenu = [];

            // Memeriksa apakah lib.Config ada dan mengatur nama menu jika tersedia
            if (lib.Config) {
                if (lib.Config.menu) MenuName = lib.Config.menu;
                if (lib.Config.disableMenu) disableMenu = lib.Config.disableMenu;
                delete lib.Config;
            }

            // Menginisialisasi MenuName di FunctionCommand jika belum ada
            if (MenuName && !FunctionCommand[MenuName]) {
                FunctionCommand[MenuName] = {};
            }

            // Iterasi melalui kunci-kunci di lib dan menetapkan mereka ke FunctionCommand
            Object.keys(lib).forEach(key => {
                if (!disableMenu.includes(key)) {
                    if (MenuName === "") {
                        if (!FunctionCommand[""]) FunctionCommand[""] = {}; // Pastikan kunci kosong ada
                            FunctionCommand[""][key] = lib[key];
                    } else {
                            FunctionCommand[MenuName][key] = lib[key];
                    }
                };
            });

        }
    });
});

WhatsappEvent();
