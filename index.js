const {
  DisconnectReason,
  makeCacheableSignalKeyStore, fetchLatestBaileysVersion, makeWASocket
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
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })

async function WhatsappEvent() {
  await LoadMenu();
  const { error, version } = await fetchLatestBaileysVersion()
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
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    version,
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
    defaultQueryTimeoutMs: undefined
  });

  sock.ev.on('groups.update', async ([event]) => {
    const metadata = await sock.groupMetadata(event.id)
    groupCache.set(event.id, metadata)
  })

  sock.ev.on('group-participants.update', async (event) => {
    const metadata = await sock.groupMetadata(event.id)
    groupCache.set(event.id, metadata)
  })

  const worker = new Worker("./utilities/earthquake-worker.js");

  worker.on("message", async (data) => {
    earthquake.handler(data, sock);
  });

  // Handle errors
  worker.on("error", (e) => {
    console.error("Worker error:", e);
  });

  store.bind(sock.ev);

  sock.ev.on("chats.set", () => {
    console.log("got chats", store.chats.all());
  });

  sock.ev.on('contacts.upsert', () => {
    console.log('got contacts', Object.values(store.contacts))
  })

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update || {};
    if (qr) {
      console.log(await QRCode.toString(qr, {type:'terminal'}))
    }

    if (connection === "open") {
      earthquake.active = true;
      console.log("Connection opened");
      if (Config?.debug) {
        await sock.sendMessage(`${Config?.Owner}@s.whatsapp.net`, {
          text: `[DEBUG] Bot is online!`,
        });
      }
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log("Reconnecting...");
        worker
          .terminate()
          .then(() => {
            // console.log("\nLoading complete");
          })
          .catch((error) => {
            console.error("Error stopping worker:", error);
          });
        await WhatsappEvent(); // Ensure to wait for reconnection
      }
    }
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
await WhatsappEvent();
