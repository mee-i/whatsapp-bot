const { Config } = require("../config");
const fs = require("fs");
const path = require("path");
const { fetchGroupMetadata } = require("../core/memory-store");

const DB_PATH = path.resolve(__dirname, "../database/earthquake.json");

function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = deg => deg * Math.PI / 180;
    const R = 6371.0088;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function ensureDatabase() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({
            MessageNotification: [],
            Earthquake: []
        }, null, 2), "utf8");
    }
    
    const raw = fs.readFileSync(DB_PATH, "utf8");
    try {
        return JSON.parse(raw);
    } catch {
        fs.writeFileSync(DB_PATH, JSON.stringify({
            MessageNotification: [],
            Earthquake: []
        }, null, 2), "utf8");
        return { MessageNotification: [], Earthquake: [] };
    }
}

let firstData = true;
module.exports = {
    active: false,
    handler: async (data, sock) => {
        if (!module.exports.active)
            return;
        const db = ensureDatabase();
        const notifications = db.MessageNotification;
        
        const lat = data?.lintang;
        const lon = data?.bujur;
        if (isNaN(lat) || isNaN(lon)) {
            console.warn("Koordinat gempa tidak valid.");
            return;
        }
        
        const isDuplicate = db.Earthquake.find(q => q.eventid === data?.eventid);
        if (isDuplicate) return;
        
        const radius = (Math.exp(data?.mag / 1.01 - 0.13));
        
        if (Config?.debug) {
            const localdistance = haversineDistance(lat, lon, -6.935029649648002, 107.71769384357208).toFixed(2);
            const radius = (Math.exp(data?.mag / 1.01 - 0.13)).toFixed(2);
            const localmessage = `🌐 *[DEBUG] Realtime Earthquake*
📍 *Jarak:* ${localdistance} km dari lokasi anda
📅 *Waktu (UTC+7):* ${data?.waktu}
📌 *Area:* ${data?.area}
📐 *Lintang:* ${data?.lintang}
📐 *Bujur:* ${data?.bujur}
📏 *Kedalaman:* ${data?.dalam} km
💥 *Magnitudo:* ${data?.mag}
⭕ *Radius:* ${radius} km
🧭 *Fokal:* ${data?.fokal}
🆔 *Event ID:* ${data?.eventid}
✅ *Status:* ${data?.status}

Data ini realtime dari BMKG. www.bmkg.go.id`;
            await sock.sendMessage(`${Config?.Owner}@s.whatsapp.net`, { text: localmessage });
        }
        for (const location of notifications) {
            const userLat = parseFloat(location.lat);
            const userLon = parseFloat(location.lon);
            if (isNaN(userLat) || isNaN(userLon)) continue;

            const distance = haversineDistance(lat, lon, userLat, userLon).toFixed(2);
            if (distance > radius) continue;

            const message = `🌐 *Peringatan Gempa!*
📍 *Jarak:* ${distance} km dari lokasi anda
📅 *Waktu (UTC+7):* ${data?.waktu}
📌 *Area:* ${data?.area}
📐 *Lintang:* ${data?.lintang}
📐 *Bujur:* ${data?.bujur}
📏 *Kedalaman:* ${data?.dalam} km
💥 *Magnitudo:* ${data?.mag}
⭕ *Radius:* ${radius} km
🧭 *Fokal:* ${data?.fokal}
🆔 *Event ID:* ${data?.eventid}
✅ *Status:* ${data?.status}

Data ini realtime dari BMKG. www.bmkg.go.id`;

            const groupData = await fetchGroupMetadata(location.id, sock).catch(() => null);
            const mentions = groupData?.participants.map(p => p.id) || [];

            await sock.sendMessage(location.id, { text: message, mentions });
        }

        db.Earthquake.push({
            eventid: data?.eventid,
            status: data?.status,
            waktu: data?.waktu,
            lintang: data?.lintang,
            bujur: data?.bujur,
            dalam: data?.dalam,
            mag: data?.mag,
            fokal: data?.fokal,
            area: data?.area
        });

        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 4), "utf8");
    }
};
