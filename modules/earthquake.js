const fs = require("node:fs");

async function notifgempa({ sock, msg }, latitude, longitude) {
    const Database = fs.readFileSync("./database/earthquake.json");
    const EarthquakeDB = JSON.parse(Database);
    if (!EarthquakeDB["MessageNotification"])
        EarthquakeDB["MessageNotification"] = [];

    const Exists = EarthquakeDB["MessageNotification"].find(mn => mn.id === msg?.key?.remoteJid);

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
        await sock.sendMessage(msg?.key?.remoteJid, {
            text: "Silahkan masukkan lokasi anda berada yang valid. /notifgempa <lintang> <bujur>\nContoh: /notifgempa -6.93 107.71"
        });
        return;
    }

    if (!Exists) {
        EarthquakeDB["MessageNotification"].push({ id: msg?.key?.remoteJid, lat, lon });
        fs.writeFileSync(
            "./database/earthquake.json",
            JSON.stringify(EarthquakeDB, null, 4),
            "utf8"
        );
        await sock.sendMessage(msg?.key?.remoteJid, { text: `Notifikasi gempa *diaktifkan* di chat ini.\n*Lokasi Penerima*\nLintang: ${lat}\nBujur: ${lon}` });
    }
    else {
        await sock.sendMessage(msg?.key?.remoteJid, { text: "Notifikasi sudah *diaktifkan* di chat ini tidak perlu diaktifkan ulang.\nUntuk menonaktifkan ketik /matikannotifgempa" })
    }
}

async function matikannotifgempa({ sock, msg }) {
    const Database = fs.readFileSync("./database/earthquake.json");
    const EarthquakeDB = JSON.parse(Database);
    if (!EarthquakeDB["MessageNotification"])
        EarthquakeDB["MessageNotification"] = [];

    const Exists = EarthquakeDB["MessageNotification"].find(mn => mn.id === msg?.key?.remoteJid);

    if (Exists) {
        EarthquakeDB["MessageNotification"] = EarthquakeDB["MessageNotification"].filter(mn => mn.id !== msg?.key?.remoteJid);
        fs.writeFileSync(
            "./database/earthquake.json",
            JSON.stringify(EarthquakeDB, null, 4),
            "utf8"
        );
        await sock.sendMessage(msg?.key?.remoteJid, { text: "Notifikasi gempa *dinonaktifkan* di chat ini." });
    }
    else {
        await sock.sendMessage(msg?.key?.remoteJid, { text: "Notifikasi sudah *dinonaktifkan* di chat ini tidak perlu dinonaktifkan ulang.\nUntuk mengaktifkan ketik /notifgempa" })
    }
}

module.exports = {
    notifgempa,
    matikannotifgempa,
    Config: {
        menu: "Earthquake"
    }
}
