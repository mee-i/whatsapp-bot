const { parentPort } = require('node:worker_threads');
const { EarthquakeAPI, RealtimeEarthquakeAPI } = require('../config.js');

import { parseStringPromise } from "xml2js";
import https from "https";

async function fetchXML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", err => reject(err));
  });
}

export async function getLatestEarthquake() {
  try {
    const xmlData = await fetchXML(RealtimeEarthquakeAPI);
    const parsed = await parseStringPromise(xmlData, { explicitArray: false });
    const gempa = parsed.Infogempa.gempa;

    const latest = Array.isArray(gempa) ? gempa[0] : gempa;

    const timeStr = latest.waktu.trim();
    const originalDate = new Date(timeStr.replace("  ", "T") + "Z");
    const offsetInMs = 7 * 60 * 60 * 1000;
    const dateUtcPlus7 = new Date(originalDate.getTime() + offsetInMs);
    const formatted = dateUtcPlus7.toISOString().replace("T", " ").replace("Z", "");

    return {
      eventid: latest.eventid,
      status: latest.status,
      waktu: formatted,
      lintang: parseFloat(latest.lintang),
      bujur: parseFloat(latest.bujur),
      dalam: parseInt(latest.dalam),
      mag: parseFloat(latest.mag),
      fokal: latest.fokal,
      area: latest.area
    };
  } catch (err) {
        console.error("Error fetching earthquake:", err);
    return null;
  }
}

async function sendFrame() {
    try {
        const data = await getLatestEarthquake();
        if (!data) {
            throw new Error('Failed to fetch earthquake data');
        }
        parentPort.postMessage(data);
    } catch (error) {
        console.error('Error fetching EarthquakeAPI:', error.message);
        parentPort.postMessage({ error: error.message });
    }
    setTimeout(sendFrame, 3000);
}

sendFrame();
