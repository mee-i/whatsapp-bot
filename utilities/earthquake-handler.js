const { Config } = require("../config");
const { fetchGroupMetadata } = require("../core/memory-store");
const db = require("../database");

const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = deg => deg * Math.PI / 180;
    const R = 6371.0088;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const createMessage = (data, distance, radius, isDebug = false) => {
    const prefix = isDebug ? '🌐 *[DEBUG] Realtime Earthquake*' : '⚠️ *Peringatan Gempa!* ⚠️';
    return `${prefix}
*Jarak:* ${distance} km dari lokasi anda
*Waktu (UTC+7):* ${data.waktu}
*Area:* ${data.area}
*Lintang:* ${data.lintang}
*Bujur:* ${data.bujur}
*Kedalaman:* ${data.dalam} km
*Magnitudo:* ${data.mag}
*Radius:* ${radius} km
*Fokal:* ${data.fokal}
*Event ID:* ${data.eventid}
*Status:* ${data.status}

Data ini realtime dari BMKG
https://inatews.bmkg.go.id/wrs/index.html
`;
};

const sendNotifications = async (data, sock, radius) => {
    const notifications = await db.sql.select().from(db.messageNotificationTable);
    const { lintang: lat, bujur: lon } = data;
    
    const sendPromises = notifications
        .filter(location => {
            const userLat = parseFloat(location.lat);
            const userLon = parseFloat(location.lon);
            if (isNaN(userLat) || isNaN(userLon)) return false;
            
            const distance = haversineDistance(lat, lon, userLat, userLon);
            return distance <= radius;
        })
        .map(async location => {
            const userLat = parseFloat(location.lat);
            const userLon = parseFloat(location.lon);
            const distance = haversineDistance(lat, lon, userLat, userLon).toFixed(2);
            const message = createMessage(data, distance, radius);
            
            const groupData = await fetchGroupMetadata(location.id, sock).catch(() => null);
            const mentions = groupData?.participants.map(p => p.id) || [];
            
            return sock.sendMessage(location.id, { text: message, mentions });
        });
    
    await Promise.all(sendPromises);
};

module.exports = {
    active: false,
    handler: async (data, sock) => {
        if (!module.exports.active) return;
        
        const { lintang: lat, bujur: lon, eventid, mag } = data;
        
        if (isNaN(lat) || isNaN(lon)) {
            console.warn("Koordinat gempa tidak valid.");
            return;
        }
        
        const [existingRecord] = await db.sql
            .select()
            .from(db.earthquakeTable)
            .where(db.eq(db.earthquakeTable.event_id, eventid));
            
        if (existingRecord) return;
        
        const radius = Math.exp(mag / 1.01 - 0.13);
        
        if (Config?.debug) {
            const debugDistance = haversineDistance(lat, lon, -6.935029649648002, 107.71769384357208).toFixed(2);
            const debugMessage = createMessage(data, debugDistance, radius.toFixed(2), true);
            await sock.sendMessage(`${Config.Owner}@s.whatsapp.net`, { text: debugMessage });
        }
        
        await Promise.all([
            sendNotifications(data, sock, radius),
            db.sql.insert(db.earthquakeTable).values({
                event_id: eventid,
                status: data.status,
                waktu: data.waktu,
                lintang: lat,
                bujur: lon,
                dalam: data.dalam,
                mag,
                fokal: data.fokal,
                area: data.area
            })
        ]);
    }
};