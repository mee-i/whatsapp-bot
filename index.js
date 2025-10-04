import { closeBrowser } from "./browser.js";
import makeWASocket, {
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    Browsers,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import WAEvents from "./core/events.js";
import store from "./core/memory-store.js";
import colors from "./utilities/colors.js";
import Terminal from "./utilities/terminal.js";
import earthquake from "./utilities/earthquake-handler.js";
import figlet from "figlet";
import { Worker } from "node:worker_threads";
import { LoadMenu } from "./load-menu.js";
import NodeCache from "node-cache";
import { useMySQLAuthState } from "mysql-baileys";
import pino from "pino";
import { Config } from "./config.js";

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

class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.worker = null;
        this.reconnectAttempts = 0;
        this.isShuttingDown = false;
        this.storeWriteInterval = null;
        this.connectionRetryTimeout = null;

        // Configuration
        this.config = {
            maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS) || 5,
            reconnectDelay: parseInt(process.env.RECONNECT_DELAY) || 5000,
            storeWriteInterval: parseInt(process.env.STORE_WRITE_INTERVAL) || 10000,
            queryTimeout: parseInt(process.env.QUERY_TIMEOUT) || 60000,
            keepAliveInterval: 30000,
            maxBackoffDelay: 30000,
        };

        // Group metadata cache
        this.groupCache = new NodeCache({
            stdTTL: 300, // 5 minutes
            useClones: false,
            checkperiod: 60,
        });

        this.initializeStore();
        this.setupProcessHandlers();
    }

    initializeStore() {
        try {
            store.readFromFile("./baileys_store.json");
            logger.info("Store loaded successfully");
        } catch (error) {
            logger.warn(`Failed to load store, starting fresh: ${error.message}`);
        }

        this.storeWriteInterval = setInterval(() => {
            this.saveStore();
        }, this.config.storeWriteInterval);
    }

    saveStore() {
        try {
            store.writeToFile("./baileys_store.json");
        } catch (error) {
            logger.error("Failed to write store:", error);
        }
    }

    setupProcessHandlers() {
        const gracefulShutdown = async (signal) => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;

            logger.info(`${signal} received. Initiating graceful shutdown...`);
            await this.cleanup();
            process.exit(0);
        };

        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        
        process.on("uncaughtException", (error) => {
            logger.fatal("Uncaught Exception:", error);
            gracefulShutdown("uncaughtException");
        });
        
        process.on("unhandledRejection", (reason, promise) => {
            logger.error("Unhandled Rejection at:", promise, "reason:", reason);
        });
    }

    async cleanup() {
        logger.info("Cleaning up resources...");

        try {
            // Clear intervals
            if (this.storeWriteInterval) {
                clearInterval(this.storeWriteInterval);
                this.storeWriteInterval = null;
            }

            if (this.connectionRetryTimeout) {
                clearTimeout(this.connectionRetryTimeout);
                this.connectionRetryTimeout = null;
            }

            // Terminate worker
            await this.terminateWorker();

            // Save store one last time
            this.saveStore();
            logger.info("Final store save completed");

            // Close browser if used
            await closeBrowser();

            // Close socket gracefully
            if (this.sock) {
                this.sock.end(undefined);
                this.sock = null;
            }

            logger.info("Cleanup completed successfully");
        } catch (error) {
            logger.error("Error during cleanup:", error);
        }
    }

    async initializeSocket() {
        try {
            // Fetch latest Baileys version
            const { error, version } = await fetchLatestBaileysVersion();
            if (error) {
                logger.error("Error fetching Baileys version:", error);
                throw error;
            }
            logger.info(`Using Baileys version: ${version.join(".")}`);

            // Initialize auth state from MySQL
            const { state, saveCreds } = await useMySQLAuthState({
                session: process.env.MYSQL_SESSION || "session_1",
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASSWORD,
                host: process.env.MYSQL_HOST,
                port: parseInt(process.env.MYSQL_PORT) || 3306,
                database: process.env.MYSQL_DATABASE,
                tableName: process.env.MYSQL_TABLE || "auth",
            });

            // Create WhatsApp socket
            this.sock = makeWASocket({
                // History sync - disabled for performance
                shouldSyncHistoryMessages: false,
                syncFullHistory: false,
                
                // Authentication
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                
                // Version
                version,
                
                // Timeouts and intervals
                defaultQueryTimeoutMs: this.config.queryTimeout,
                keepAliveIntervalMs: this.config.keepAliveInterval,
                
                // Caching
                cachedGroupMetadata: (jid) => this.groupCache.get(jid),
                
                // Message retrieval
                getMessage: async (key) => {
                    try {
                        const data = await store.loadMessage(key.remoteJid, key.id);
                        return data?.message || undefined;
                    } catch (error) {
                        logger.debug(`Failed to retrieve message ${key.id}: ${error.message}`);
                        return undefined;
                    }
                },
                
                // Message patching for buttons/lists
                patchMessageBeforeSending: (message) => this.patchMessage(message),
                
                // Retry configuration
                retryRequestDelayMs: 250,
                maxMsgRetryCount: 3,
                
                // Browser info
                browser: Browsers.windows("Desktop"),
                
                // Logger
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
        // Patch messages that require special handling (buttons, templates, lists)
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
        // Bind store to socket events
        store.bind(this.sock.ev);

        // Group metadata updates
        this.sock.ev.on("groups.update", async (events) => {
            for (const event of events) {
                try {
                    const metadata = await this.sock.groupMetadata(event.id);
                    this.groupCache.set(event.id, metadata);
                } catch (error) {
                    logger.debug(`Failed to update group metadata for ${event.id}: ${error.message}`);
                }
            }
        });

        // Group participant updates
        this.sock.ev.on("group-participants.update", async (event) => {
            try {
                const metadata = await this.sock.groupMetadata(event.id);
                this.groupCache.set(event.id, metadata);
            } catch (error) {
                logger.debug(`Failed to update group participants for ${event.id}: ${error.message}`);
            }
        });

        // Chats loaded
        this.sock.ev.on("chats.set", () => {
            logger.info(`Loaded ${store.chats.all().length} chats`);
        });

        // Contacts loaded
        this.sock.ev.on("contacts.upsert", () => {
            logger.info(`Loaded ${Object.values(store.contacts).length} contacts`);
        });

        // Connection updates
        this.sock.ev.on("connection.update", (update) => {
            this.handleConnectionUpdate(update);
        });

        // Connection errors
        this.sock.ev.on("connection.error", (error) => {
            logger.error("Connection error:", error);
        });

        // Incoming messages
        this.sock.ev.on("messages.upsert", async (m) => {
            try {
                await WAEvents.MessageEventsHandler(m, this.sock);
            } catch (error) {
                logger.error("Message handling error:", error);
                Terminal.ErrorLog?.(error);
            }
        });

        // Message updates (edits, reactions, etc)
        this.sock.ev.on("messages.update", (updates) => {
            logger.debug(`Messages updated: ${updates.length}`);
        });

        // Credentials update
        this.sock.ev.on("creds.update", saveCreds);
    }

    async handleConnectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update;

        // Display QR code
        if (qr) {
            await this.displayQRCode(qr);
        }

        // Handle connection state changes
        switch (connection) {
            case "open":
                await this.handleConnectionOpen();
                break;
            case "close":
                await this.handleConnectionClose(lastDisconnect);
                break;
            case "connecting":
                logger.info("Connecting to WhatsApp...");
                break;
        }
    }

    async displayQRCode(qr) {
        try {
            const qrString = await QRCode.toString(qr, {
                type: "terminal",
                small: true,
                scale: 1,
            });
            console.log(qrString);
            logger.info("QR code displayed. Scan with WhatsApp to authenticate.");
        } catch (error) {
            logger.error("Failed to generate QR code:", error);
        }
    }

    async handleConnectionOpen() {
        this.reconnectAttempts = 0;
        earthquake.active = true;
        
        logger.info("✓ Connected to WhatsApp successfully!");

        // Initialize worker thread
        await this.initializeWorker();

        // Send debug notification if configured
        if (Config?.debug && Config?.Owner) {
            await this.sendDebugNotification();
        }
    }

    async sendDebugNotification() {
        try {
            const timestamp = new Date().toLocaleString();
            await this.sock.sendMessage(`${Config.Owner}@s.whatsapp.net`, {
                text: `[DEBUG] Bot is online! Connected at ${timestamp}`,
            });
        } catch (error) {
            logger.debug(`Failed to send debug notification: ${error.message}`);
        }
    }

    async handleConnectionClose(lastDisconnect) {
        if (this.isShuttingDown) return;

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message || "Unknown error";

        logger.warn(`Connection closed. Status: ${statusCode}, Error: ${errorMessage}`);

        earthquake.active = false;
        await this.terminateWorker();

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            await this.scheduleReconnect();
        } else if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            logger.error("Maximum reconnection attempts reached. Shutting down.");
            await this.cleanup();
            process.exit(1);
        } else {
            logger.info("Bot logged out. Manual intervention required.");
            await this.cleanup();
            process.exit(0);
        }
    }

    async scheduleReconnect() {
        this.reconnectAttempts++;
        const backoffDelay = Math.min(
            this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
            this.config.maxBackoffDelay
        );

        logger.info(
            `Reconnecting in ${backoffDelay}ms... (Attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
        );

        this.connectionRetryTimeout = setTimeout(async () => {
            try {
                await this.start();
            } catch (error) {
                logger.error("Reconnection failed:", error);
                if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
                    await this.scheduleReconnect();
                }
            }
        }, backoffDelay);
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
                    logger.warn(`Worker exited with code ${code}`);
                }
            });

            logger.info("Worker thread initialized");
        } catch (error) {
            logger.error("Failed to initialize worker:", error);
        }
    }

    async terminateWorker() {
        if (this.worker) {
            try {
                await this.worker.terminate();
                this.worker = null;
                logger.info("Worker terminated");
            } catch (error) {
                logger.error("Error terminating worker:", error);
            }
        }
    }

    async start() {
        if (this.isShuttingDown) {
            logger.warn("Cannot start: shutdown in progress");
            return;
        }

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
        // Display banner
        figlet("MeeI-Bot", (err, data) => {
            if (err) {
                logger.error("Figlet error:", err);
                return;
            }
            console.log(colors.FgGreen + data + colors.Reset);
        });

        logger.info("Starting MeeI-Bot...");

        const bot = new WhatsAppBot();
        await bot.start();
    } catch (error) {
        logger.fatal("Fatal error:", error);
        process.exit(1);
    }
}

main();