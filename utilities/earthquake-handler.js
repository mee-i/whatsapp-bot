
const fs = require("fs");
const https = require("https");
const store = require("../core/memory-store.js");

module.exports = {
    handler: async (data, sock) => {
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
                        const groupdata = await store.fetchGroupMetadata(element.id, sock);
                        const mentions = [];
                        for (const participant of groupdata.participants) {
                            mentions.push(participant.id);
                        }
                        await sock.sendMessage(element.id, {
                            image: { url: `./database/Shakemap/${gempa?.Shakemap}` },
                            caption: EarthquakeMessage,
                            mentions
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
    }
}