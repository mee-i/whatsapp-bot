const { chromium } = require('playwright');

console.log("[ℹ️] Launching chromium browser for brat image generation...");
const browser = chromium.launch({headless: true});

module.exports = {
    browser
}
