const { parentPort } = require('node:worker_threads');
const { EarthquakeAPI } = require('../config.js');

async function sendFrame() {
    try {
        const response = await fetch(EarthquakeAPI, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        parentPort.postMessage(data);
    } catch (error) {
        console.error('Error fetching EarthquakeAPI:', error.message);
        parentPort.postMessage({ error: error.message });
    }
    setTimeout(sendFrame, 1000);
}

sendFrame();
