import { unlink } from "node:fs";
import { closeBrowser } from "./browser.js";

const {
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    makeWASocket,
    Browsers,
} = require("baileys");

const QRCode = require("qrcode");

const WAEvents = require("./core/events.js");
const store = require("./core/memory-store.js");
const colors = require("./utilities/colors.js");
const Terminal = require("./utilities/terminal.js");
const earthquake = require("./utilities/earthquake-handler.js");

const figlet = require("figlet");
const { Worker } = require("node:worker_threads");
const { LoadMenu } = require("./load-menu.js");
const NodeCache = require("node-cache");
const { useMySQLAuthState } = require("mysql-baileys");
const pino = require("pino");

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    },
});

const { Config } = require("./config.js");

class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.worker = null;
        this.reconnectAttempts = 0;
        this.isShuttingDown = false;
        this.storeWriteInterval = null;

        this.MAX_RECONNECT_ATTEMPTS =
            parseInt(process.env.MAX_RECONNECT_ATTEMPTS) || 5;
        this.RECONNECT_DELAY = parseInt(process.env.RECONNECT_DELAY) || 5000;
        this.STORE_WRITE_INTERVAL =
            parseInt(process.env.STORE_WRITE_INTERVAL) || 10000;

        this.groupCache = new NodeCache({
            stdTTL: 5 * 60,
            useClones: false,
            checkperiod: 60,
        });

        this.initializeStore();
        this.setupProcessHandlers();
    }

    initializeStore() {
        try {
            writeFile("./baileys_store.json", "{}");
        } catch (error) {
            logger.error("Failed to create store file:", error);
        }
        try {
            store.readFromFile("./baileys_store.json");
            logger.info("Store loaded successfully");
        } catch (error) {
            logger.warn("Failed to load store, starting fresh:", error.message);
        }

        this.storeWriteInterval = setInterval(() => {
            try {
                store.writeToFile("./baileys_store.json");
            } catch (error) {
                logger.error("Failed to write store:", error);
            }
        }, this.STORE_WRITE_INTERVAL);
    }

    setupProcessHandlers() {
        const gracefulShutdown = async (signal) => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;

            logger.info(`${signal} received! Shutting down gracefully...`);
            await this.cleanup();
            process.exit(0);
        };

        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("uncaughtException", (error) => {
            logger.error("Uncaught Exception:", error);
            gracefulShutdown("uncaughtException");
        });
        process.on("unhandledRejection", (reason, promise) => {
            logger.error("Unhandled Rejection at:", promise, "reason:", reason);
        });
    }

    async cleanup() {
        logger.info("Starting cleanup process...");

        try {
            if (this.storeWriteInterval) {
                clearInterval(this.storeWriteInterval);
                this.storeWriteInterval = null;
            }

            if (this.worker) {
                await this.worker.terminate();
                this.worker = null;
                logger.info("Worker terminated");
            }

            try {
                unlink("./baileys_store.json");
            } catch (error) {
                logger.error("Failed delete stored chat: ", error);
            }

            await closeBrowser();
            logger.info("Cleanup completed");
        } catch (error) {
            logger.error("Error during cleanup:", error);
        }
    }

    async initializeSocket() {
        try {
            const { error, version } = await fetchLatestBaileysVersion();
            if (error) {
                logger.error("Error fetching Baileys version:", error);
                throw error;
            }

            const { state, saveCreds } = await useMySQLAuthState({
                session: process.env.MYSQL_SESSION || "session_1",
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASSWORD,
                host: process.env.MYSQL_HOST,
                port: parseInt(process.env.MYSQL_PORT) || 3306,
                database: process.env.MYSQL_DATABASE,
                tableName: process.env.MYSQL_TABLE || "auth",
            });

            this.sock = makeWASocket({
                shouldSyncHistoryMessages: false,
                syncFullHistory: false,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                version,
                defaultQueryTimeoutMs:
                    parseInt(process.env.QUERY_TIMEOUT) || 60000,
                keepAliveIntervalMs: 30000,
                cachedGroupMetadata: async (jid) => this.groupCache.get(jid),
                getMessage: async (key) => {
                    try {
                        const data = await store.loadMessage(
                            key.remoteJid,
                            key.id
                        );
                        return data?.message || undefined;
                    } catch (error) {
                        logger.warn(
                            `Failed to get message ${key.id}:`,
                            error.message
                        );
                        return undefined;
                    }
                },
                patchMessageBeforeSending: this.patchMessage.bind(this),
                retryRequestDelayMs: 250,
                maxMsgRetryCount: 3,
                browser: Browsers.windows("Desktop"),
                logger,
            });

            this.setupEventHandlers(saveCreds);
            return this.sock;
        } catch (error) {
            logger.error("Failed to initialize socket:", error);
            throw error;
        }
    }

    patchMessage(message) {
        const requiresPatch = !!(
            message.buttonsMessage ||
            message.templateMessage ||
            message.listMessage
        );

        if (requiresPatch) {
            return {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadataVersion: 2,
                            deviceListMetadata: {},
                        },
                        ...message,
                    },
                },
            };
        }

        return message;
    }

    setupEventHandlers(saveCreds) {
        store.bind(this.sock.ev);

        this.sock.ev.on("groups.update", async (events) => {
            for (const event of events) {
                try {
                    const metadata = await this.sock.groupMetadata(event.id);
                    this.groupCache.set(event.id, metadata);
                } catch (error) {
                    logger.warn(
                        `Failed to update group metadata for ${event.id}:`,
                        error.message
                    );
                }
            }
        });

        this.sock.ev.on("group-participants.update", async (event) => {
            try {
                const metadata = await this.sock.groupMetadata(event.id);
                this.groupCache.set(event.id, metadata);
            } catch (error) {
                logger.warn(
                    `Failed to update group participants for ${event.id}:`,
                    error.message
                );
            }
        });

        this.sock.ev.on("chats.set", () => {
            logger.info(`Loaded ${store.chats.all().length} chats`);
        });

        this.sock.ev.on("contacts.upsert", () => {
            logger.info(
                `Loaded ${Object.values(store.contacts).length} contacts`
            );
        });

        this.sock.ev.on(
            "connection.update",
            this.handleConnectionUpdate.bind(this)
        );

        this.sock.ev.on("connection.error", (error) => {
            logger.error("Connection error:", error);
        });

        this.sock.ev.on("messages.upsert", async (m) => {
            try {
                await WAEvents.MessageEventsHandler(m, this.sock);
            } catch (error) {
                logger.error("Message handling error:", error);
                Terminal.ErrorLog(error);
            }
        });

        this.sock.ev.on("message.update", (message) => {
            logger.debug("Message updated:", message?.[0]?.key?.id);
        });

        this.sock.ev.on("creds.update", saveCreds);
    }

    async handleConnectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update || {};

        if (qr) {
            try {
                const qrString = await QRCode.toString(qr, {
                    type: "terminal",
                    small: true,
                    scale: 1,
                });
                console.log(qrString);
                logger.info("QR code displayed. Please scan with WhatsApp.");
            } catch (error) {
                logger.error("Failed to generate QR code:", error);
            }
        }

        if (connection === "open") {
            await this.handleConnectionOpen();
        } else if (connection === "close") {
            await this.handleConnectionClose(lastDisconnect);
        } else if (connection === "connecting") {
            logger.info("Connecting to WhatsApp...");
        }
    }

    async handleConnectionOpen() {
        earthquake.active = true;
        this.reconnectAttempts = 0;
        logger.info("Connection opened successfully!");

        await this.initializeWorker();

        if (Config?.debug && Config?.Owner) {
            try {
                await this.sock.sendMessage(`${Config.Owner}@s.whatsapp.net`, {
                    text: `[DEBUG] Bot is online! Connected at ${new Date().toLocaleString()}`,
                });
            } catch (error) {
                logger.warn("Failed to send debug message:", error.message);
            }
        }
    }

    async handleConnectionClose(lastDisconnect) {
        if (this.isShuttingDown) return;

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message || "Unknown error";

        logger.error(
            `Connection closed. Status: ${statusCode}, Error: ${errorMessage}`
        );

        earthquake.active = false;
        await this.terminateWorker();

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (
            shouldReconnect &&
            this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS
        ) {
            this.reconnectAttempts++;
            logger.info(
                `Attempting to reconnect... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`
            );

            setTimeout(async () => {
                try {
                    await this.start();
                } catch (error) {
                    logger.error("Reconnection failed:", error);
                    const backoffDelay =
                        this.RECONNECT_DELAY *
                        Math.pow(2, this.reconnectAttempts - 1);
                    setTimeout(
                        () => this.start(),
                        Math.min(backoffDelay, 30000)
                    );
                }
            }, this.RECONNECT_DELAY);
        } else if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            logger.error("Max reconnection attempts reached. Stopping bot.");
            await this.cleanup();
            process.exit(1);
        } else {
            logger.info("Bot logged out. Manual intervention required.");
            await this.cleanup();
            process.exit(0);
        }
    }

    async initializeWorker() {
        try {
            this.worker = new Worker("./utilities/earthquake-worker.js");

            this.worker.on("message", async (data) => {
                try {
                    await earthquake.handler(data, this.sock);
                } catch (error) {
                    logger.error("Earthquake handler error:", error);
                }
            });

            this.worker.on("error", (error) => {
                logger.error("Worker error:", error);
            });

            this.worker.on("exit", (code) => {
                if (code !== 0 && !this.isShuttingDown) {
                    logger.warn(`Worker stopped with exit code ${code}`);
                }
            });

            logger.info("Worker initialized successfully");
        } catch (error) {
            logger.error("Failed to initialize worker:", error);
        }
    }

    async terminateWorker() {
        if (this.worker) {
            try {
                await this.worker.terminate();
                this.worker = null;
                logger.info("Worker terminated successfully");
            } catch (error) {
                logger.error("Error terminating worker:", error);
            }
        }
    }

    async start() {
        if (this.isShuttingDown) return;

        try {
            await LoadMenu();
            await this.initializeSocket();
            logger.info("Bot started successfully");
        } catch (error) {
            logger.error("Failed to start bot:", error);
            throw error;
        }
    }
}

async function main() {
    try {
        figlet("MeeI-Bot", (err, data) => {
            if (err) {
                logger.error("Figlet error:", err);
                return;
            }
            console.log(colors.FgGreen + data + colors.Reset);
        });

        logger.info("Starting Bot...");

        const bot = new WhatsAppBot();
        await bot.start();
    } catch (error) {
        logger.error("Fatal error:", error);
        process.exit(1);
    }
}

await main();
