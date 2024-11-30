const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const makeWASocket = require('@whiskeysockets/baileys').default;
const WAEvents = require('./modules/events');
const figlet = require('figlet');
const colors = require('./modules/utilities/colors');
const { FunctionCommand, Config } = require('./config');
const fs = require('fs')
const path = require('path');
const Terminal = require('./modules/utilities/terminal');
const { Worker } = require("worker_threads");
const https = require("https");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function WhatsappEvent() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true,
        auth: state
    });

    const worker = new Worker("./modules/earthquake-worker.js");

    worker.on("message", async (data) => {
        if (!data?.Infogempa?.gempa) {
            console.log("NoGempaFound");
            return;
        }

        const Database = fs.readFileSync("./database/earthquake.json");

        const EarthquakeDB = JSON.parse(Database);
        if (!EarthquakeDB["MessageNotification"])
            EarthquakeDB["MessageNotification"] = [];

        if (!EarthquakeDB["Earthquake"])
            EarthquakeDB["Earthquake"] = [];

        const isExist = EarthquakeDB["Earthquake"].find(quake => quake.DateTime === data?.Infogempa?.gempa?.DateTime);

        if (!isExist) {
            const gempa = data?.Infogempa?.gempa;
            const ShakemapURL = `https://data.bmkg.go.id/DataMKG/TEWS/${gempa?.Shakemap}`;

            const res = await fetch(ShakemapURL);
            if (!res.ok) await sock.sendMessage(`${Config.Owner}@s.whatsapp.net`,`Failed to fetch image: ${res.statusText}`);
            const file = fs.createWriteStream(`./database/Shakemap/${gempa?.Shakemap}`);
            let isDownloadComplete = false;
            const request = https.get(ShakemapURL, async function(response) {
                response.pipe(file);

                // after download completed close filestream
                file.on("finish", async () => {
                    file.close();
                    isDownloadComplete = true;
                    // await sock.sendMessage(Config.Owner + "@s.whatsapp.net", {text: "Downloaded"});
                });
            });

            if (!EarthquakeDB["MessageNotification"])
                EarthquakeDB["MessageNotification"] = [];
            else {
                EarthquakeDB["MessageNotification"].forEach(async element => {
                    //const InArea = gempa?.Dirasakan.toLowerCase().includes(element?.wilayah.toLowerCase());
                    const InArea = gempa?.Dirasakan.toLowerCase().match(new RegExp("(\\W|^)" + (element?.wilayah.toLowerCase() ?? "") + "(\\W|$)", "i"));
                    if (InArea !== null || (element?.wilayah == "*")) {
                        let EarthquakeMessage = `**WARNING!**
--> Notifikasi Gempa <--
Jam: ${gempa?.Jam}
Koordinat: ${gempa?.Coordinates}
Magnitude: ${gempa?.Magnitude}
sKedalaman: ${gempa?.Kedalaman}
Wilayah: ${gempa?.Wilayah}
Potensi: ${gempa?.Potensi}
Dirasakan: ${gempa?.Dirasakan}

www.bmkg.go.id
                        `;
                        await new Promise((resolve) => {
                            const checkInterval = setInterval(() => {
                                if (isDownloadComplete) {
                                    clearInterval(checkInterval); // Stop interval saat boolean true
                                    resolve(); // Lanjutkan proses setelah boolean true
                                }
                            }, 50);
                        });
                        await sock.sendMessage(element.id, {image: {url: `./database/Shakemap/${gempa?.Shakemap}`}, caption: EarthquakeMessage});
                    }
                });
            }
            EarthquakeDB["Earthquake"].push(data?.Infogempa?.gempa);
        }
        fs.writeFileSync(
            "./database/earthquake.json",
            JSON.stringify(EarthquakeDB, null, 4),
            "utf8"
        );
    });

    // Handle errors
    worker.on("error", (e) => {
        console.error("Worker error:", e);
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
                worker.terminate().then(() => {
                        // console.log("\nLoading complete");
                })
                .catch((error) => {
                        console.error("Error stopping worker:", error);
                });
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
