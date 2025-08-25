const { db, messageNotificationTable, eq } = require("../database");

async function notifgempa({ sock, msg }, latitude, longitude) {

    const Exists = await db.select().from(messageNotificationTable).where(
        eq(messageNotificationTable.id, msg?.key?.remoteJid)
    ).then(res => res.length == 1);

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
        await sock.sendMessage(msg?.key?.remoteJid, {
            text: "Silahkan masukkan lokasi anda berada yang valid. /notifgempa <lintang> <bujur>\nContoh: /notifgempa -6.93 107.71"
        });
        return;
    }

    if (!Exists) {
        await db.insert(messageNotificationTable).values({
            id: msg?.key?.remoteJid,
            lat: lat,
            lon: lon
        });
        await sock.sendMessage(msg?.key?.remoteJid, { text: `Notifikasi gempa *diaktifkan* di chat ini.\n*Lokasi Penerima*\nLintang: ${lat}\nBujur: ${lon}` });
    }
    else {
        await sock.sendMessage(msg?.key?.remoteJid, { text: "Notifikasi sudah *diaktifkan* di chat ini tidak perlu diaktifkan ulang.\nUntuk menonaktifkan ketik /matikannotifgempa" })
    }
}

async function matikannotifgempa({ sock, msg }) {
    const Exists = await db.select().from(messageNotificationTable).where(
        messageNotificationTable.id.equals(msg?.key?.remoteJid)
    ).then(res => res.length == 1);

    if (Exists) {
        await db.delete(messageNotificationTable).where(
            messageNotificationTable.id.equals(msg?.key?.remoteJid)
        );
        await sock.sendMessage(msg?.key?.remoteJid, { text: "Notifikasi gempa *dinonaktifkan* di chat ini." });
    }
    else {
        await sock.sendMessage(msg?.key?.remoteJid, { text: "Tidak ada notifikasi gempa yang aktif di chat ini.\nUntuk mengaktifkan ketik /notifgempa" })
    }
}

module.exports = {
    notifgempa,
    matikannotifgempa,
    Config: {
        menu: "Earthquake"
    }
}
