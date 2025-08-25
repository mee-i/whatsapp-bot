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
*Event ID:* ${data.event_id || data.eventid}
*Status:* ${data.status}

Source: BMKG
`;
};

const sendNotifications = async (data, sock, radius) => {
    try {
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
                try {
                    const userLat = parseFloat(location.lat);
                    const userLon = parseFloat(location.lon);
                    const distance = haversineDistance(lat, lon, userLat, userLon).toFixed(2);
                    const message = createMessage(data, distance, radius);
                    
                    const groupData = await fetchGroupMetadata(location.id, sock).catch(() => null);
                    const mentions = groupData?.participants.map(p => p.id) || [];
                    
                    return await sock.sendMessage(location.id, { text: message, mentions });
                } catch (error) {
                    console.error(`Error sending notification to ${location.id}:`, error);
                    return null;
                }
            });
        
        await Promise.allSettled(sendPromises);
    } catch (error) {
        console.error('Error in sendNotifications:', error);
        throw error;
    }
};

module.exports = {
    active: false,
    handler: async (data, sock) => {
        if (!module.exports.active) return;
        
        // Konsistensi nama field - gunakan event_id atau eventid secara konsisten
        const eventId = data.event_id || data.eventid;
        const { lintang: lat, bujur: lon, mag } = data;
        
        if (isNaN(lat) || isNaN(lon)) {
            console.warn("Koordinat gempa tidak valid:", { lat, lon });
            return;
        }
        
        if (!eventId) {
            console.warn("Event ID tidak tersedia:", data);
            return;
        }
        
        try {
            // Cek apakah record sudah ada dengan error handling
            const existingRecord = await db.sql
                .select()
                .from(db.earthquakeTable)
                .where(db.eq(db.earthquakeTable.event_id, eventId))
                .catch(error => {
                    console.error('Database query error:', error);
                    // Return empty array jika ada error, supaya proses bisa lanjut
                    return [];
                });
                
            if (existingRecord && existingRecord.length > 0) {
                // console.log(`Event ${eventId} sudah ada di database, skip processing`);
                return;
            }
            
            const radius = Math.exp(mag / 1.01 - 0.13);
            
            // Debug message
            if (Config?.debug) {
                try {
                    const debugDistance = haversineDistance(lat, lon, -6.935029649648002, 107.71769384357208).toFixed(2);
                    const debugMessage = createMessage({...data, event_id: eventId}, debugDistance, radius.toFixed(2), true);
                    await sock.sendMessage(`${Config.Owner}@s.whatsapp.net`, { text: debugMessage });
                } catch (debugError) {
                    console.error('Debug message error:', debugError);
                }
            }
            
            // Parallel execution dengan error handling terpisah
            const [notificationResult, insertResult] = await Promise.allSettled([
                sendNotifications({...data, event_id: eventId}, sock, radius),
                db.sql.insert(db.earthquakeTable).values({
                    event_id: eventId,
                    status: data.status,
                    waktu: data.waktu,
                    lintang: lat,
                    bujur: lon,
                    dalam: data.dalam,
                    mag,
                    fokal: data.fokal,
                    area: data.area
                }).catch(error => {
                    console.error('Database insert error:', error);
                    throw error;
                })
            ]);
            
            // Log hasil
            if (notificationResult.status === 'rejected') {
                console.error('Notification sending failed:', notificationResult.reason);
            }
            
            if (insertResult.status === 'rejected') {
                console.error('Database insert failed:', insertResult.reason);
                // Jangan throw error di sini supaya notifikasi tetap terkirim
            } else {
                console.log(`Successfully processed earthquake event: ${eventId}`);
            }
            
        } catch (error) {
            console.error('Handler error:', error);
            // Optionally bisa kirim error message ke admin
            if (Config?.debug && Config?.Owner) {
                try {
                    await sock.sendMessage(`${Config.Owner}@s.whatsapp.net`, { 
                        text: `🚨 *Earthquake Handler Error*\n\nEvent ID: ${eventId}\nError: ${error.message}\n\nStack: ${error.stack?.substring(0, 500)}...`
                    });
                } catch (adminNotifyError) {
                    console.error('Failed to notify admin about error:', adminNotifyError);
                }
            }
        }
    }
};