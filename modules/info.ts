import { defineCommand, FunctionCommand } from "@core/menu";
import { Config as BotConfig } from "@/config";
import { Config as ConfigFile } from "@utils/runtime-config";

/**
 * Display bot information
 */
export const info = defineCommand(
    {
        usage: "${prefix}info",
        menu: "Info",
        info: "Display bot information",
    },
    async ({ sock, reply }) => {
        const groups = await sock.groupFetchAllParticipating();
        const groupCount = Object.keys(groups).length;
        const users = await ConfigFile.ReadUserData();
        const userCount = Object.keys(users).length;

        const message = `*Info MeeI Bot*
*Total Group: ${groupCount}
*Total Fitur: ${Object.keys(FunctionCommand).length}
*Total User: ${userCount}
`;
        await reply(message);
    }
);

/**
 * Say command using new structure
 */
export const say = defineCommand(
    {
        usage: "${prefix}say <text>",
        category: "General",
        info: "Saying the text that you want",
        permission: ["owner"],
    },
    async ({ send, args }) => {
        if (!args[0]) {
            await send("Please provide text to say!");
            return;
        }
        const text = args.join(" ");
        await send(text);
    }
);

/**
 * Ping command to check bot response time
 */
export const ping = defineCommand(
    {
        usage: "${prefix}ping",
        alias: ["pong"],
        menu: "Info",
        info: "Check bot response time",
    },
    async ({ send }) => {
        const startTime = Date.now();

        await send("...");

        const endTime = Date.now();
        const executionTime = endTime - startTime;
        await send(`Pong ${executionTime} ms!`);
    }
);

/**
 * Display bot owner contact
 */
export const owner = defineCommand(
    {
        usage: "${prefix}owner",
        menu: "Info",
        info: "Display bot owner contact",
    },
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
    }
);

/**
 * Display total menu count
 */
export const totalmenu = defineCommand(
    {
        usage: "${prefix}totalmenu",
        menu: "Info",
        info: "Display total menu count",
    },
    async ({ send }) => {
        const total = Object.keys(FunctionCommand).length;
        await send(`Total fitur saat ini adalah ${total}`);
    }
);

/**
 * Send bug report to owner
 */
export const bug = defineCommand(
    {
        usage: "${prefix}bug <message>",
        menu: "Info",
        info: "Send bug report to owner",
    },
    async ({ sock, msg, send, reply, args }) => {
        const message = args.join(" ");
        if (!message) {
            await send("Silakan masukkan pesan bug yang ingin dilaporkan!");
            return;
        }

        await sock.sendMessage(`${BotConfig.Owner}@s.whatsapp.net`, {
            text: `[BUG REPORT]
From: *${msg.pushName}*
Jid: *${msg.key?.remoteJid}*
Pesan: _${message}_`,
        });
        await reply("Pesan telah dikirim kepada owner bot!");
    }
);

/**
 * Alias for bug command
 */
export const report = defineCommand(
    {
        usage: "${prefix}report <message>",
        menu: "Info",
        info: "Alias for bug command",
        permission: ["all"],
    },
    async (ctx, ...args) => {
        return bug(ctx, ...args);
    }
);
