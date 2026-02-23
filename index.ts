import makeWASocket, { Browsers, DisconnectReason, getContentType } from "baileys";
import P from "pino";
import { db, authTable } from "./database/index.js";
import { usePostgreSQLAuthState } from "./core/postgres-auth.js";
import { MessageEventsHandler } from "./core/events.js";
import { store } from "./core/memory-store.js";
import { LoadMenu } from "@core/menu";
import QRCode from "qrcode";
import {
    startEarthquakeWorker,
    stopEarthquakeWorker,
} from "./utilities/earthquake-handler.ts";
import { startWebhookServer } from "./utilities/webhook-server.ts";
import figlet from "figlet";
import { terminal } from "@utilities/terminal.ts";

async function startBot() {
    // Load all modules first
    console.log("📦 Loading modules...");
    await LoadMenu();
    console.log("✅ Modules loaded!");

    // Initialize PostgreSQL auth state
    const { state, saveCreds, clearState } = await usePostgreSQLAuthState(
        db,
        authTable,
        "baileys"
    );

    const sock = makeWASocket({
        auth: state, // Custom PostgreSQL auth state
        logger: P({ level: "silent" }), // Change to "debug" for debugging
        browser: Browsers.macOS("Desktop"),
        syncFullHistory: false,
        // shouldSyncHistoryMessage: () => false,
    });

    store.bind(sock);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === "close") {
            stopEarthquakeWorker();
            const shouldReconnect =
                (lastDisconnect?.error as any)?.output?.statusCode !==
                DisconnectReason.connectionLost;

            console.log(
                "Connection closed due to",
                lastDisconnect?.error,
                ", reconnecting:",
                shouldReconnect
            );

            if (shouldReconnect) {
                startBot();
            } else {
                console.log(
                    "❌ Device Logged Out (Device Removed). Clearing auth state and restarting..."
                );
                await clearState();
                console.log("✅ Auth state cleared. Restarting bot...");
                startBot();
            }
        } else if (connection === "open") {
            console.log("✅ Connected to WhatsApp!");

            startEarthquakeWorker(sock);
            startWebhookServer(sock).then(() => {
                console.log("🌐 Webhook server is running!");
            });
        }
        if (qr) {
            console.log(await QRCode.toString(qr, { type: "terminal" }));
        }
    });

    sock.ev.on("messages.upsert", async (rawdata) => {
        if (rawdata.type === "notify") {
            await MessageEventsHandler(rawdata, sock);
        }
    });

    sock.ev.on("call", async ([ctx]) => {
        terminal.WarnLog(`[CALL]: from ${ctx.from} id ${ctx.id}, rejecting...`)
        await sock.rejectCall(ctx.id, ctx.from);
        // await sock.sendMessage(ctx.from, { text: "Sorry, I can't receive calls." });
    })
}

figlet("Miza Bot", (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(data);
});
startBot();
