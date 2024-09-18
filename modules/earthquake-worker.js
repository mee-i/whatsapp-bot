const { parentPort } = require('worker_threads');
const { EarthquakeAPI } = require('../config');
const fs = require("fs");
const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');

function sendFrame() {
    fetch(EarthquakeAPI, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    }).then(async (r) => {
        const data = await r.json();
        parentPort.postMessage(data);
    }).catch((e) => {
        console.log(e);
    })
    setTimeout(sendFrame, 1000);
}

sendFrame();