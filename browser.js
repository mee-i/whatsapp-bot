// browser.js
const { chromium } = require('playwright');

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
    console.log('✅ Chromium launched once');
  }
  return browser;
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    console.log('🛑 Chromium closed');
  }
}

module.exports = { getBrowser, closeBrowser };
