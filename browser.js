const { chromium } = require('playwright');

let browser = null;

const getBrowser = async () => {
    if (!browser) {
        browser = await chromium.launch({ headless: true });
        console.log('✅ Chromium launched once');
    }
    return browser;
};

const closeBrowser = async () => {
    if (browser) {
        await browser.close();
        browser = null;
        console.log('🛑 Chromium closed');
    }
};

module.exports = { getBrowser, closeBrowser };