import { Worker } from "node:worker_threads";

import { Config } from "../config";
import { store } from "@core/memory-store";
import { db, messageNotificationTable, earthquakeTable, eq } from "@db/index";
import type { WASocket } from "baileys";
// Import EarthquakeData interface from worker if needed, or redefine
interface EarthquakeData {
    eventid: string; // or event_id
    event_id?: string;
    status: string;
    waktu: string;
    lintang: number;
    bujur: number;
    dalam: number;
    mag: number;
    fokal: string;
    area: string;
}

const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371.0088;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const createMessage = (
    data: EarthquakeData,
    distance: string | number,
    radius: string | number,
    isDebug = false
) => {
    const prefix = isDebug
        ? "🌐 *[DEBUG] Realtime Earthquake*"
        : "⚠️ *Peringatan Gempa!* ⚠️";
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

const sendNotifications = async (
    data: EarthquakeData,
    sock: WASocket,
    radius: number
) => {
    try {
        const notifications = await db.select().from(messageNotificationTable);
        const { lintang: lat, bujur: lon } = data;

        const sendPromises = notifications
            .filter((location) => {
                const userLat = location.lat;
                const userLon = location.lon;
                if (isNaN(userLat) || isNaN(userLon)) return false;

                const distance = haversineDistance(lat, lon, userLat, userLon);
                return distance <= radius;
            })
            .map(async (location) => {
                try {
                    const userLat = location.lat;
                    const userLon = location.lon;
                    const distance = haversineDistance(
                        lat,
                        lon,
                        userLat,
                        userLon
                    ).toFixed(2);
                    const message = createMessage(data, distance, radius);

                    const groupData = await store
                        .fetchGroupMetadata(location.id, sock)
                        .catch(() => null);
                    // participants id string[]
                    const mentions =
                        groupData?.participants.map((p: any) => p.id) || [];

                    return await sock.sendMessage(location.id, {
                        text: message,
                        mentions,
                    });
                } catch (error) {
                    console.error(
                        `Error sending notification to ${location.id}:`,
                        error
                    );
                    return null;
                }
            });

        await Promise.allSettled(sendPromises);
    } catch (error) {
        console.error("Error in sendNotifications:", error);
        throw error;
    }
};

export const active = false;

export const handler = async (data: EarthquakeData, sock: WASocket) => {
    if (!active) return;

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
        const existingRecord = await db
            .select()
            .from(earthquakeTable)
            .where(eq(earthquakeTable.event_id, eventId))
            .catch((error) => {
                console.error("Database query error:", error);
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
                const debugDistance = haversineDistance(
                    lat,
                    lon,
                    -6.935029649648002,
                    107.71769384357208
                ).toFixed(2);
                const debugMessage = createMessage(
                    { ...data, event_id: eventId },
                    debugDistance,
                    radius.toFixed(2),
                    true
                );
                if (Config.Owner) {
                    await sock.sendMessage(`${Config.Owner}@lid`, {
                        text: debugMessage,
                    });
                }
            } catch (debugError) {
                console.error("Debug message error:", debugError);
            }
        }

        // Parallel execution dengan error handling terpisah
        const [notificationResult, insertResult] = await Promise.allSettled([
            sendNotifications({ ...data, event_id: eventId }, sock, radius),
            db
                .insert(earthquakeTable)
                .values({
                    event_id: eventId,
                    status: data.status,
                    waktu: data.waktu,
                    lintang: lat,
                    bujur: lon,
                    dalam: data.dalam,
                    mag,
                    fokal: data.fokal,
                    area: data.area,
                })
                .catch((error) => {
                    console.error("Database insert error:", error);
                    throw error;
                }),
        ]);

        // Log hasil
        if (notificationResult.status === "rejected") {
            console.error(
                "Notification sending failed:",
                notificationResult.reason
            );
        }

        if (insertResult.status === "rejected") {
            console.error("Database insert failed:", insertResult.reason);
            // Jangan throw error di sini supaya notifikasi tetap terkirim
        } else {
            console.log(`Successfully processed earthquake event: ${eventId}`);
        }
    } catch (error) {
        console.error("Handler error:", error);
        // Optionally bisa kirim error message ke admin
        if (Config?.debug && Config?.Owner) {
            try {
                await sock.sendMessage(`${Config.Owner}@lid`, {
                    text: `🚨 *Earthquake Handler Error*\n\nEvent ID: ${eventId}\nError: ${
                        (error as Error).message
                    }\n\nStack: ${(error as Error).stack?.substring(
                        0,
                        500
                    )}...`,
                });
            } catch (adminNotifyError) {
                console.error(
                    "Failed to notify admin about error:",
                    adminNotifyError
                );
            }
        }
    }
};

let worker: Worker | null = null;

export const startEarthquakeWorker = (sock: WASocket) => {
    if (worker) return;

    worker = new Worker(new URL("./earthquake-worker.ts", import.meta.url));

    worker.on("message", (data) => {
        if (data.error) {
            console.error("Earthquake worker error:", data.error);
        } else {
            handler(data, sock);
        }
    });

    worker.on("error", (err) =>
        console.error("Earthquake worker failed:", err)
    );

    console.log("🌍 Earthquake worker started");
};

export const stopEarthquakeWorker = () => {
    if (worker) {
        worker.terminate();
        worker = null;
        console.log("⚠️ Earthquake worker terminated");
    }
};
