import { closeBrowser } from "./browser.js";

const {
  DisconnectReason,
  makeCacheableSignalKeyStore, fetchLatestBaileysVersion, makeWASocket, Browsers
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
const { useMySQLAuthState } = require('mysql-baileys');
const pino = require("pino");
const logger = pino({});
const { Config } = require("./config.js");

store.readFromFile("./baileys_store.json");

setInterval(() => {
  store.writeToFile("./baileys_store.json");
}, 10_000);

const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

async function WhatsappEvent() {
  await LoadMenu();
  const { error, version } = await fetchLatestBaileysVersion();
  if (error) {
    console.error("Error fetching latest Baileys version:", error);
    return WhatsappEvent();
  }
  
  const { state, saveCreds } = await useMySQLAuthState({
    session: "session_1",
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    database: process.env.MYSQL_DATABASE,
    tableName: "auth"
  });
  
  const sock = makeWASocket({
    shouldSyncHistoryMessages: false,
    syncFullHistory: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    version,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
    getMessage: async (key) => {
      const data = await store.loadMessage(key.remoteJid, key.id);
      return data?.message || undefined;
    },
    patchMessageBeforeSending: (message) => {
      const requiresPatch = !!(
        message.buttonsMessage
        || message.templateMessage
        || message.listMessage
      );
      if (requiresPatch) {
        message = {
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
    },
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 3,
    browser: Browsers.windows("Desktop"),
  });

  sock.ev.on('groups.update', async ([event]) => {
    const metadata = await sock.groupMetadata(event.id);
    groupCache.set(event.id, metadata);
  });

  sock.ev.on('group-participants.update', async (event) => {
    const metadata = await sock.groupMetadata(event.id);
    groupCache.set(event.id, metadata);
  });

  const worker = new Worker("./utilities/earthquake-worker.js");

  worker.on("message", async (data) => {
    earthquake.handler(data, sock);
  });

  worker.on("error", (e) => {
    console.error("Worker error:", e);
  });

  store.bind(sock.ev);

  sock.ev.on("chats.set", () => {
    console.log("got chats", store.chats.all());
  });

  sock.ev.on('contacts.upsert', () => {
    console.log('got contacts', Object.values(store.contacts));
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update || {};
    
    if (qr) {
      console.log(await QRCode.toString(qr, {type:'terminal', small: true, scale: 1}));
    }

    if (connection === "open") {
      earthquake.active = true;
      reconnectAttempts = 0;
      console.log(colors.FgGreen + "Connection opened successfully!" + colors.Reset);
      
      if (Config?.debug) {
        await sock.sendMessage(`${Config?.Owner}@s.whatsapp.net`, {
          text: `[DEBUG] Bot is online! Connected at ${new Date().toLocaleString()}`,
        });
      }
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errorMessage = lastDisconnect?.error?.message || "Unknown error";
      
      console.log(colors.FgRed + `Connection closed. Status: ${statusCode}, Error: ${errorMessage}` + colors.Reset);
      
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(colors.FgYellow + `Attempting to reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})` + colors.Reset);
        
        worker
          .terminate()
          .then(() => {
            console.log("Worker terminated successfully");
          })
          .catch((error) => {
            console.error("Error stopping worker:", error);
          });
        
        setTimeout(async () => {
          try {
            await WhatsappEvent();
          } catch (error) {
            console.error("Reconnection failed:", error);
            setTimeout(() => WhatsappEvent(), RECONNECT_DELAY * reconnectAttempts);
          }
        }, RECONNECT_DELAY);
        
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log(colors.FgRed + "Max reconnection attempts reached. Stopping bot." + colors.Reset);
        process.exit(1);
      } else {
        console.log(colors.FgRed + "Bot logged out. Manual intervention required." + colors.Reset);
        process.exit(0);
      }
    }

    if (connection === "connecting") {
      console.log(colors.FgYellow + "Connecting to WhatsApp..." + colors.Reset);
    }
  });

  sock.ev.on('connection.error', (error) => {
    console.error(colors.FgRed + "Connection error:", error + colors.Reset);
  });

  sock.ev.on("messages.upsert", async (m) => {
    try {
      await WAEvents.MessageEventsHandler(m, sock);
    } catch (e) {
      Terminal.ErrorLog(e);
    }
  });

  sock.ev.on("message.update", (message) => {
    console.log("Received message:", message?.toString());
  });

  sock.ev.on("creds.update", saveCreds);

  setInterval(async () => {
    try {
      if (sock?.user) {
        await sock.query({
          tag: 'iq',
          attrs: { type: 'get', xmlns: 'urn:xmpp:ping' }
        });
        console.log("Keep-alive ping sent");
      }
    } catch (error) {
      console.log("Keep-alive ping failed:", error.message);
    }
  }, 30000);
}

figlet("MeeI-Bot", (err, data) => {
  if (err) {
    console.error("Something went wrong...");
    console.dir(err);
    return;
  }
  console.log(colors.FgGreen + data + colors.Reset);
});

console.log("Starting Bot...");
process.on('SIGINT', async () => {
  console.log('\n🛑 Ctrl+C detected! Cleaning up...');
  await closeBrowser();
  process.exit(0);
});

await WhatsappEvent();