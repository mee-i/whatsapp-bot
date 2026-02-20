import { defineCommand } from "@core/menu";
import { cludz } from "@utils/cludz";
import fs from "node:fs";

/**
 * TOOLS
 */

export const qrtext = defineCommand(
    {
        usage: "${prefix}qrtext <text>",
        menu: "Tools",
        info: "Generate QR code from text",
    },
    async ({ reply, args }) => {
        if (!args[0]) {
            await reply("Please provide text to generate QR code!");
            return;
        }
        const text = args.join(" ");
        const response = await cludz.tools.qr(text);        
        const buffer = Buffer.from(await response.arrayBuffer());
        await reply({
            media: buffer,
            caption: "Here's your QR code!",
        });
    }
);

export const barcode = defineCommand(
    {
        usage: "${prefix}barcode <text>",
        menu: "Tools",
        info: "Generate barcode from text",
    },
    async ({ reply, args }) => {
        if (!args[0]) {
            await reply("Please provide text to generate barcode!");
            return;
        }
        const text = args.join(" ");
        const response = await cludz.tools.barcode(text);
        const buffer = Buffer.from(await response.arrayBuffer());
        await reply({
            media: buffer,
            caption: "Here's your barcode!",
        });
    }
);

export const webcheck = defineCommand(
    {
        usage: "${prefix}webcheck <url>",
        menu: "Tools",
        info: "Check website status and latency",
    },
    async ({ reply, args }) => {
        if (!args[0]) return reply("Please provide a URL!");
        const inputUrl = args[0];
        const hasProtocol = inputUrl.startsWith("http://") || inputUrl.startsWith("https://");

        if (hasProtocol) {
            const res = await cludz.tools.webCheck(inputUrl); 
            if (!res.data) return reply("Failed to check website.");
            
            await reply(`*Web Check: ${inputUrl}*\n\n` +
                `*Status:* ${res.data.status} ${res.data.statusText}\n` +
                `*Content Type:* ${res.data.contentType}\n` +
                `*Latency:* ${res.data.latency}`);
        } else {
            const protocols = ["http://", "https://"];
            const results = await Promise.all(
                protocols.map(async (p) => {
                    const url = p + inputUrl;
                    try {
                        const res = await cludz.tools.webCheck(url);
                        return { url, res };
                    } catch {
                        return { url, res: { data: null } };
                    }
                })
            );

            let text = `*Web Check: ${inputUrl}*\n\n`;
            results.forEach(({ url, res }) => {
                text += `*URL:* ${url}\n`;
                if (!res.data) {
                    text += `_Failed to check this protocol_\n\n`;
                } else {
                    text += `*Status:* ${res.data.status} ${res.data.statusText}\n` +
                        `*Content Type:* ${res.data.contentType || "N/A"}\n` +
                        `*Latency:* ${res.data.latency}\n\n`;
                }
            });
            await reply(text.trim());
        }
    }
);

export const dns = defineCommand(
    {
        usage: "${prefix}dns <domain>",
        menu: "Tools",
        info: "Get DNS records for a domain",
    },
    async ({ reply, args }) => {
        if (!args[0]) return reply("Please provide a domain!");
        const res = await cludz.tools.dns(args[0]);
        if (!res.data) return reply("Failed to get DNS records.");
        
        const data = res.data;
        let text = `*DNS Records: ${args[0]}*\n\n`;
        console.log(JSON.stringify(data));
        if (data.A) text += `*A:* ${data.A.join(", ")}\n\n`;
        if (data.AAAA) text += `*AAAA:* ${data.AAAA.join(", ")}\n\n`;
        if (data.MX) text += `*MX:* ${data.MX.map(m => `${m.exchange} (${m.priority})`).join(", ")}\n\n`;
        if (data.NS) text += `*NS:* ${data.NS.join(", ")}\n\n`;
        if (data.TXT) text += `*TXT:* ${data.TXT.map(t => t.join(" ")).join("\n")}\n\n`;
        
        await reply(text);
    }
);

export const ssl = defineCommand(
    {
        usage: "${prefix}ssl <domain>",
        menu: "Tools",
        info: "Get SSL certificate info",
    },
    async ({ reply, args }) => {
        if (!args[0]) return reply("Please provide a domain!");
        const res = await cludz.tools.ssl(args[0]);
        if (!res.data) return reply("Failed to get SSL info.");
        
        const data = res.data;
        await reply(`*SSL Info: ${args[0]}*\n\n` +
            `*Subject:* ${data.subject.CN || "N/A"}\n` +
            `*Issuer:* ${data.issuer.O || "N/A"}\n` +
            `*Valid From:* ${new Date(data.valid_from).toLocaleDateString()}\n` +
            `*Valid To:* ${new Date(data.valid_to).toLocaleDateString()}\n` +
            `*Remaining:* ${data.remaining_days} days`);
    }
);

export const meta = defineCommand(
    {
        usage: "${prefix}meta <url>",
        menu: "Tools",
        info: "Get OpenGraph metadata for a URL",
    },
    async ({ reply, args }) => {
        if (!args[0]) return reply("Please provide a URL!");
        const res = await cludz.tools.meta(args[0]);
        if (!res.data) return reply("Failed to get metadata.");
        
        const data = res.data;
        let text = `*Metadata: ${args[0]}*\n\n`;
        Object.entries(data).forEach(([key, value]) => {
            if (typeof value === "string") {
                text += `*${key}:* ${value}\n`;
            }
        });
        
        await reply(text);
    }
);

export const cludzstatus = defineCommand(
    {
        usage: "${prefix}cludzstatus",
        menu: "Tools",
        info: "Get Cludz API monitoring stats",
    },
    async ({ reply }) => {
        const data = await cludz.account.status();
        if (!data) return reply("Failed to get monitoring stats.");
        
        await reply(`*Cludz API Stats*\n\n` +
            `*Requests:* ${JSON.stringify(data.requests)}\n` +
            `*Uptime:* ${data.uptime}\n` +
            `*Error Rate:* ${data.error_rate}%\n` +
            `*Avg Response Time:* ${data.avg_response_time_ms}ms\n` +
            `*Timestamp:* ${new Date(data.timestamp).toLocaleString()}`);
    }
);

/**
 * IMAGE
 */

export const meme = defineCommand(
    {
        usage: "${prefix}meme <top> | [bottom]",
        menu: "Image",
        info: "Generate a meme from an image",
        requireImage: true,
    },
    async ({ reply, args, mediaPath }) => {
        const text = args.join(" ");
        if (!text) return reply("Please provide text! Format: top | bottom");
        
        const parts = text.split("|").map(s => s.trim());
        const top = parts[0];
        const bottom = parts[1];
        
        const buffer = fs.readFileSync(mediaPath!);
        const response = await cludz.image.meme(buffer, top, bottom);
        const imgBuffer = Buffer.from(await response.arrayBuffer());
        await reply({
            media: imgBuffer,
            caption: "Here's your meme!",
        });
    }
);

export const compress = defineCommand(
    {
        usage: "${prefix}compress [quality]",
        menu: "Image",
        info: "Compress an image (default 80)",
        requireImage: true,
    },
    async ({ reply, args, mediaPath }) => {
        const quality = args[0] ? parseInt(args[0]) : 80;
        const buffer = fs.readFileSync(mediaPath!);
        const response = await cludz.image.compress(buffer, quality);
        const imgBuffer = Buffer.from(await response.arrayBuffer());
        await reply({
            media: imgBuffer,
            caption: `Compressed with quality ${quality}`,
        });
    }
);

export const convert = defineCommand(
    {
        usage: "${prefix}convert <format>",
        menu: "Image",
        info: "Convert image format (jpeg, png, webp, avif)",
        requireImage: true,
    },
    async ({ reply, args, mediaPath }) => {
        const format = args[0] as any;
        const validFormats = ["jpeg", "jpg", "png", "webp", "avif"];
        if (!validFormats.includes(format)) {
            return reply(`Invalid format! Use: ${validFormats.join(", ")}`);
        }
        
        const buffer = fs.readFileSync(mediaPath!);
        const response = await cludz.image.convert(buffer, format);
        const imgBuffer = Buffer.from(await response.arrayBuffer());
        await reply({
            media: imgBuffer,
            caption: `Converted to ${format}`,
        });
    }
);

export const crop = defineCommand(
    {
        usage: "${prefix}crop <left> <top> <width> <height>",
        menu: "Image",
        info: "Crop an image",
        requireImage: true,
    },
    async ({ reply, args, mediaPath }) => {
        if (args.length < 4) {
            return reply("Usage: ${prefix}crop <left> <top> <width> <height>");
        }
        const [left, top, width, height] = args.map(Number);
        if (isNaN(left) || isNaN(top) || isNaN(width) || isNaN(height)) {
            return reply("Invalid dimensions!");
        }
        
        const buffer = fs.readFileSync(mediaPath!);
        const response = await cludz.image.crop(buffer, { left, top, width, height });
        const imgBuffer = Buffer.from(await response.arrayBuffer());
        await reply({
            media: imgBuffer,
            caption: "Cropped image!",
        });
    }
);

/**
 * DOWNLOADER
 */

export const ytsearch = defineCommand(
    {
        usage: "${prefix}ytsearch <query>",
        menu: "Downloader",
        info: "Search YouTube videos",
        alias: ["yts"],
    },
    async ({ reply, args }) => {
        if (!args[0]) return reply("Please provide a search query!");
        const query = args.join(" ");
        const res = await cludz.downloader.youtube.search(query, 5);
        const data = await cludz.tasks.waitFor(res.data.taskId);
        if (!data || data.data?.list?.length === 0) return reply("No videos found.");
        
        let text = `*YouTube Search Results for:* ${query}\n\n`;
        data.data?.list?.forEach((v, i) => {
            text += `${i + 1}. *${v.title}*\n`;
            text += `   Duration: @${v.duration_string}\n`;
            text += `   Views: ${v.views.toLocaleString()}\n`;
            text += `   URL: ${v.url}\n\n`;
        });
        await reply(text);
    }
);

export const ytmp3 = defineCommand(
    {
        usage: "${prefix}ytmp3 <url/query>",
        menu: "Downloader",
        info: "Download YouTube audio",
    },
    async ({ reply, args }) => {
        if (!args[0]) return reply("Please provide a URL or query!");
        const input = args.join(" ");
        const isUrl = input.includes("youtube.com") || input.includes("youtu.be");
        
        await reply("Processing, please wait...");
        const res = isUrl 
            ? await cludz.downloader.youtube.download(input, "mp3")
            : await cludz.downloader.youtube.searchDownload(input, "mp3");

        const data = await cludz.tasks.waitFor(res.data.taskId);
        if (!data || !data.data) return reply("Failed to process request.");
        
        await reply(`${data.data.download_url}\n\nHere is your audio!`);
    }
);

export const ytmp4 = defineCommand(
    {
        usage: "${prefix}ytmp4 <url/query>",
        menu: "Downloader",
        info: "Download YouTube video",
        alias: ["yt", "youtube"],
    },
    async ({ reply, args }) => {
        if (!args[0]) return reply("Please provide a URL or query!");
        const input = args.join(" ");
        const isUrl = input.includes("youtube.com") || input.includes("youtu.be");
        
        await reply("Processing, please wait...");
        const res = isUrl 
            ? await cludz.downloader.youtube.download(input, "mp4")
            : await cludz.downloader.youtube.searchDownload(input, "mp4");
            
        const data = await cludz.tasks.waitFor(res.data.taskId);
        if (!data || !data.data) return reply("Failed to process request.");
        
        await reply(`${data.data.download_url}\n\nHere is your video!`);
    }
);

export const tiktok = defineCommand(
    {
        usage: "${prefix}tiktok <url>",
        menu: "Downloader",
        info: "Download TikTok video",
        alias: ["ttdl", "tiktokdl", "tt"],
    },
    async ({ reply, args }) => {
        if (!args[0]) return reply("Please provide a TikTok URL!");
        
        await reply("Processing, please wait...");
        const res = await cludz.downloader.tiktok.download(args[0], "mp4");
            
        const data = await cludz.tasks.waitFor(res.data.taskId);
        if (!data || !data.data) return reply("Failed to process request.");
        
        await reply(`${data.data.download_url}\n\nHere is your TikTok video!`);
    }
);

export const dl = defineCommand(
    {
        usage: "${prefix}dl <platform> <url>",
        menu: "Downloader",
        info: "Download media from various platforms",
    },
    async ({ reply, args }) => {
        if (args.length < 2) return reply("Usage: ${prefix}dl <platform> <url>");
        const [platform, url] = args;
        
        await reply("Processing, please wait...");
        const res = await cludz.downloader.download(platform, url, "mp4");
            
        const data = await cludz.tasks.waitFor(res.data.taskId);
        if (!data || !data.data) return reply("Failed to process request.");
        
        await reply(`${data.data.download_url}\n\nHere is your ${platform} media!`);
    }
);