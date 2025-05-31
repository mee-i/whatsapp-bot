const { Config } = require("../config");
const { fetchGroupMetadata } = require("../core/memory-store");
const db = require("../database");

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

module.exports = {
    active: false,
    handler: async (data, sock) => {
        if (!module.exports.active)
            return;
        const notifications = await db.sql.select().from(db.messageNotificationTable);
        
        const lat = data?.lintang;
        const lon = data?.bujur;
        if (isNaN(lat) || isNaN(lon)) {
            console.warn("Koordinat gempa tidak valid.");
            return;
        }
        
        const isDuplicate = await db.sql.select().from(db.earthquakeTable).where(db.eq(db.earthquakeTable.event_id, data?.eventid)).then(res => res.length == 1);
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


        await db.sql.insert(db.earthquakeTable).values({
            event_id: data?.eventid,
            status: data?.status,
            waktu: data?.waktu,
            lintang: data?.lintang,
            bujur: data?.bujur,
            dalam: data?.dalam,
            mag: data?.mag,
            fokal: data?.fokal,
            area: data?.area
        });
    }
};
