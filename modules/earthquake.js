const fs = require("node:fs");

async function notifgempa(sock, key, wilayah) {
    const Database = fs.readFileSync("./database/earthquake.json");
    const EarthquakeDB = JSON.parse(Database);
    if (!EarthquakeDB["MessageNotification"])
        EarthquakeDB["MessageNotification"] = [];

    const Exists = EarthquakeDB["MessageNotification"].find(mn => mn.id === key?.remoteJid);

    if (!Exists) {
        EarthquakeDB["MessageNotification"].push({id: key?.remoteJid, wilayah: wilayah});
        fs.writeFileSync(
            "./database/earthquake.json",
            JSON.stringify(EarthquakeDB, null, 4),
            "utf8"
        );
        await sock.sendMessage(key?.remoteJid, {text: `Notifikasi gempa pada wilayah ${wilayah} *diaktifkan* di chat ini.`});
    }
    else {
        await sock.sendMessage(key?.remoteJid, {text: "Notifikasi sudah *diaktifkan* di chat ini tidak perlu diaktifkan ulang.\nUntuk menonaktifkan ketik /matikannotifgempa"})
    }
}

async function matikannotifgempa(sock, key) {
    const Database = fs.readFileSync("./database/earthquake.json");
    const EarthquakeDB = JSON.parse(Database);
    if (!EarthquakeDB["MessageNotification"])
        EarthquakeDB["MessageNotification"] = [];

    const Exists = EarthquakeDB["MessageNotification"].find(mn => mn.id === key?.remoteJid);

    if (Exists) {
        EarthquakeDB["MessageNotification"] = EarthquakeDB["MessageNotification"].filter(mn => mn.id !== key?.remoteJid);
        fs.writeFileSync(
            "./database/earthquake.json",
            JSON.stringify(EarthquakeDB, null, 4),
            "utf8"
        );
        await sock.sendMessage(key?.remoteJid, {text: "Notifikasi gempa *dinonaktifkan* di chat ini."});
    }
    else {
        await sock.sendMessage(key?.remoteJid, {text: "Notifikasi sudah *dinonaktifkan* di chat ini tidak perlu dinonaktifkan ulang.\nUntuk mengaktifkan ketik /notifgempa"})
    }
}

module.exports = {
    notifgempa,
    matikannotifgempa,
    Config: {
        menu: "Earthquake"
    }
}
