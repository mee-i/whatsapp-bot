import { FunctionCommand } from "../load-menu.ts";
import { defineCommand } from "@core/menu";
import { Config as BotConfig } from "../config.ts";
import { Config as ConfigFile } from "../utilities/database.ts";

/**
 * Display bot information
 */
export const info = defineCommand(
    async ({ sock, msg }) => {
        const groups = await sock.groupFetchAllParticipating();
        const groupCount = Object.keys(groups).length;
        const users = await ConfigFile.ReadUserData();
        const userCount = Object.keys(users).length;

        const message = `*Info MeeI Bot*
*Total Group: ${groupCount}
*Total Fitur: ${Object.keys(FunctionCommand).length}
*Total User: ${userCount}
`;
        await sock.sendMessage(
            msg.key?.remoteJid!,
            { text: message },
            { quoted: msg as any }
        );
    },
    {
        usage: "${prefix}info",
        menu: "Info",
        info: "Display bot information",
    }
);

/**
 * Say command using new structure
 */
export const say = defineCommand(
    async ({ sock, msg, args }) => {
        if (!args[0]) {
            await sock.sendMessage(msg.key?.remoteJid!, {
                text: "Please provide text to say!",
            });
            return;
        }
        const text = args.join(" ");
        await sock.sendMessage(msg.key?.remoteJid!, { text });
    },
    {
        usage: "${prefix}say <text>",
        category: "General",
        info: "Saying the text that you want",
        permission: ["owner"],
    }
);

/**
 * Ping command to check bot response time
 */
export const ping = defineCommand(
    async ({ sock, msg }) => {
        const startTime = Date.now();

        await sock.sendMessage(msg.key?.remoteJid!, { text: "..." });

        const endTime = Date.now();
        const executionTime = endTime - startTime;
        await sock.sendMessage(msg.key?.remoteJid!, {
            text: `Pong ${executionTime} ms!`,
        });
    },
    {
        usage: "${prefix}ping",
        alias: ["pong"],
        menu: "Info",
        info: "Check bot response time",
    }
);

/**
 * Display bot owner contact
 */
export const owner = defineCommand(
    async ({ sock, msg }) => {
        const vcard =
            "BEGIN:VCARD\n" +
            "VERSION:3.0\n" +
            "FN:Miza\n" +
            "ORG:MeeI Bot Owner;\n" +
            `TEL;type=CELL;type=VOICE;waid=${BotConfig.Owner}:+${BotConfig.Owner}\n` +
            "END:VCARD";

        await sock.sendMessage(msg.key?.remoteJid!, {
            contacts: {
                displayName: "Miza",
                contacts: [{ vcard }],
            },
        });
    },
    {
        usage: "${prefix}owner",
        menu: "Info",
        info: "Display bot owner contact",
    }
);

/**
 * Display total menu count
 */
export const totalmenu = defineCommand(
    async ({ sock, msg }) => {
        const total = Object.keys(FunctionCommand).length;
        await sock.sendMessage(msg.key?.remoteJid!, {
            text: `Total fitur saat ini adalah ${total}`,
        });
    },
    {
        usage: "${prefix}totalmenu",
        menu: "Info",
        info: "Display total menu count",
    }
);

/**
 * Send bug report to owner
 */
export const bug = defineCommand(
    async ({ sock, msg, args }) => {
        const message = args.join(" ");
        if (!message) {
            await sock.sendMessage(msg.key?.remoteJid!, {
                text: "Silakan masukkan pesan bug yang ingin dilaporkan!",
            });
            return;
        }

        await sock.sendMessage(`${BotConfig.Owner}@s.whatsapp.net`, {
            text: `[BUG REPORT]
From: *${msg.pushName}*
Jid: *${msg.key?.remoteJid}*
Pesan: _${message}_`,
        });
        await sock.sendMessage(msg.key?.remoteJid!, {
            text: "Pesan telah dikirim kepada owner bot!",
        });
    },
    {
        usage: "${prefix}bug <message>",
        menu: "Info",
        info: "Send bug report to owner",
    }
);

/**
 * Alias for bug command
 */
export const report = defineCommand(
    async (ctx, ...args) => {
        return bug(ctx, ...args);
    },
    {
        usage: "${prefix}report <message>",
        menu: "Info",
        info: "Alias for bug command",
        permission: ["all"],
    }
);
