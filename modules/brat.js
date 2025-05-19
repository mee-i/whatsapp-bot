const { writeFile } = require('fs/promises');
const ffmpeg = require('fluent-ffmpeg');
const { getBrowser } = require('../browser.js');
/**
 * Generate a brat image with custom text and dimensions
 * @param {string} text - Text to render
 * @param {number} width - Screenshot width
 * @param {number} height - Screenshot height
 */

async function BratGenerator(text, width = 500, height = 500) {
    
    if (!text) throw new Error('Text is required for BratGenerator');

    const browser = await getBrowser();
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    await context.route('**/*', (route) => {
        const url = route.request().url();
        if (url.endsWith('.png') || url.endsWith('.jpg') || url.includes('google-analytics')) {
            return route.abort();
        }
        route.continue();
    });

    const page = await context.newPage();
    await page.goto('https://www.bratgenerator.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
    });

    try {
        await page.click('#onetrust-accept-btn-handler', { timeout: 2000 });
    } catch { }

    await page.evaluate(() => setupTheme('white'));
    await page.fill('#textInput', text);

    const overlay = page.locator('#textOverlay');
    const buffer = await overlay.screenshot({
        timeout: 3000,
        clip: { x: 0, y: 0, width, height },
    });

    const id = "brat_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await writeFile(`./media/downloads/${id}.png`, buffer);
    await browser.close();
    console.log(`✅ Brat image saved as ./media/downloads/${id}.png (${width}x${height})`);
    return id;
}

function convertPngToWebp(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-vcodec libwebp',
                '-lossless 1',
                '-qscale 80',
                '-preset default',
            ])
            .toFormat('webp')
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
    });
}

module.exports = {
    brat: async ({ sock, msg }, text) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `*Generating brat image*`,
        }, { quoted: msg });

        try {
            const id = await BratGenerator(text, 500, 500);
            await convertPngToWebp(`./media/downloads/${id}.png`, `./media/downloads/${id}.webp`);
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    sticker: {
                        url: `./media/downloads/${id}.webp`,
                    },
                    isAnimated: false,
                },
                {
                    quoted: msg,
                }
            );
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "Caught an error! Please try again later.",
            });
            console.error(e);
        }
    },
    Config: {
        menu: "Sticker",
        details: {
            brat: {
                description: "Generate a brat image with custom text",
            },
        },
    }
};
