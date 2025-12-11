import makeWASocket, { DisconnectReason } from "baileys";
import P from "pino";
import { db, authTable } from "./database/index.js";
import { usePostgreSQLAuthState } from "./core/postgres-auth.js";
import { MessageEventsHandler } from "./core/events.js";
import { store } from "./core/memory-store.js";
import { LoadMenu } from "./load-menu.ts";
import QRCode from "qrcode";

async function startBot() {
    // Load all modules first
    console.log("📦 Loading modules...");
    await LoadMenu();
    console.log("✅ Modules loaded!");

    // Initialize PostgreSQL auth state
    const { state, saveCreds } = await usePostgreSQLAuthState(
        db,
        authTable,
        "baileys"
    );

    const sock = makeWASocket({
        auth: state, // Custom PostgreSQL auth state
        logger: P({ level: "info" }), // Change to "debug" for debugging
    });

    // Bind memory store to socket events
    store.bind(sock.ev);

    // Handle credentials update
    sock.ev.on("creds.update", saveCreds);

    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === "close") {
            const shouldReconnect =
                (lastDisconnect?.error as any)?.output?.statusCode !==
                DisconnectReason.loggedOut;

            console.log(
                "Connection closed due to",
                lastDisconnect?.error,
                ", reconnecting:",
                shouldReconnect
            );

            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === "open") {
            console.log("✅ Connected to WhatsApp!");
        }
        if (qr) {
            console.log(await QRCode.toString(qr, { type: "terminal" }));
        }
    });

    // Handle messages with core events handler
    sock.ev.on("messages.upsert", async (rawdata) => {
        if (rawdata.type === "notify") {
            // Process new messages through core events handler
            await MessageEventsHandler(rawdata, sock);
        }
        // Ignore old/already handled messages
    });
}

startBot();
