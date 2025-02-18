const {
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const makeWASocket = require("@whiskeysockets/baileys").default;

const WAEvents = require("./core/events.js");
const store = require("./core/memory-store.js");

const colors = require("./utilities/colors.js");
const Terminal = require("./utilities/terminal.js");

const figlet = require("figlet");
const fs = require("node:fs");
const { Worker } = require("node:worker_threads");
const { LoadMenu } = require("./load-menu.js");
const https = require("https");
const NodeCache = require( "node-cache" );


store.readFromFile("./baileys_store.json");

setInterval(() => {
  store.writeToFile("./baileys_store.json");
}, 10_000);
const groupCache = new NodeCache({stdTTL: 5 * 60, useClones: false})

async function WhatsappEvent() {
  await LoadMenu();
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({
    // can provide additional config here
    printQRInTerminal: true,
		// shouldSyncHistoryMessage: false,
    // syncFullHistory: false,
    auth: state,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
    // getMessage: async (key) => await getMessageFromStore(key)
    getMessage: async (message) => await store.loadMessage(message.remoteJid, message.id),
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
    if (!data?.Infogempa?.gempa) {
      console.log("\n\nNoGempaFound\n\n\n");
      return;
    }
    const DbFile = "./database/earthquake.json";
    if (!fs.existsSync(DbFile))
      fs.writeFileSync(DbFile, JSON.stringify({}), "utf-8");
    const Database = fs.readFileSync(DbFile);

    const EarthquakeDB = JSON.parse(Database);
    if (!EarthquakeDB["MessageNotification"])
      EarthquakeDB["MessageNotification"] = [];

    if (!EarthquakeDB["Earthquake"]) EarthquakeDB["Earthquake"] = [];

    const isExist = EarthquakeDB["Earthquake"].find(
      (quake) => quake.DateTime === data?.Infogempa?.gempa?.DateTime
    );

    if (!isExist) {
      const gempa = data?.Infogempa?.gempa;
      const ShakemapURL = `https://data.bmkg.go.id/DataMKG/TEWS/${gempa?.Shakemap}`;

      const res = await fetch(ShakemapURL);
      if (!res.ok)
        await sock.sendMessage(
          `${Config.Owner}@s.whatsapp.net`,
          `Failed to fetch image: ${res.statusText}`
        );
      const dir = "./database/Shakemap";
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const file = fs.createWriteStream(
        `./database/Shakemap/${gempa?.Shakemap}`
      );
      let isDownloadComplete = false;
      const request = https.get(ShakemapURL, async function (response) {
        response.pipe(file);

        // after download completed close filestream
        file.on("finish", async () => {
          file.close();
          isDownloadComplete = true;
          // await sock.sendMessage(Config.Owner + "@s.whatsapp.net", {text: "Downloaded"});
        });
      });

      if (!EarthquakeDB["MessageNotification"])
        EarthquakeDB["MessageNotification"] = [];
      else {
        EarthquakeDB["MessageNotification"].forEach(async (element) => {
          //const InArea = gempa?.Dirasakan.toLowerCase().includes(element?.wilayah.toLowerCase());
          const InArea = gempa?.Dirasakan.toLowerCase().match(
            new RegExp(
              "(\\W|^)" + (element?.wilayah.toLowerCase() ?? "") + "(\\W|$)",
              "i"
            )
          );
          if (InArea !== null || element?.wilayah == "*") {
            let EarthquakeMessage = `**WARNING!**
--> Notifikasi Gempa <--
Jam: ${gempa?.Jam}
Koordinat: ${gempa?.Coordinates}
Magnitude: ${gempa?.Magnitude}
sKedalaman: ${gempa?.Kedalaman}
Wilayah: ${gempa?.Wilayah}
Potensi: ${gempa?.Potensi}
Dirasakan: ${gempa?.Dirasakan}

www.bmkg.go.id
                        `;
            await new Promise((resolve) => {
              const checkInterval = setInterval(() => {
                if (isDownloadComplete) {
                  clearInterval(checkInterval); // Stop interval saat boolean true
                  resolve(); // Lanjutkan proses setelah boolean true
                }
              }, 50);
            });
            await sock.sendMessage(element.id, {
              image: { url: `./database/Shakemap/${gempa?.Shakemap}` },
              caption: EarthquakeMessage,
            });
          }
        });
      }
      EarthquakeDB["Earthquake"].push(data?.Infogempa?.gempa);
    }
    fs.writeFileSync(
      "./database/earthquake.json",
      JSON.stringify(EarthquakeDB, null, 4),
      "utf8"
    );
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
      console.log(qr);
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

await WhatsappEvent();
