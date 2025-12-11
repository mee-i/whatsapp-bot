import type { CommandContext } from "../load-menu.ts";
import { FunctionCommand } from "../load-menu.ts";
import { Config as BotConfig } from "../config.ts";
import { Config as ConfigFile } from "../utilities/database.ts";

/**
 * Display bot information
 */
export async function info({ sock, msg }: CommandContext): Promise<void> {
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
}

/**
 * Ping command to check bot response time
 */
export async function ping({ sock, msg }: CommandContext): Promise<void> {
    const startTime = Date.now();

    await sock.sendMessage(msg.key?.remoteJid!, { text: "..." });

    const endTime = Date.now();
    const executionTime = endTime - startTime;
    await sock.sendMessage(msg.key?.remoteJid!, {
        text: `Pong ${executionTime} ms!`,
    });
}

/**
 * Display bot owner contact
 */
export async function owner({ sock, msg }: CommandContext): Promise<void> {
    const vcard =
        "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        "FN:Ilham\n" +
        "ORG:MeeI Bot Owner;\n" +
        "TEL;type=CELL;type=VOICE;waid=6281220533069:+6281220533069\n" +
        "END:VCARD";

    await sock.sendMessage(msg.key?.remoteJid!, {
        contacts: {
            displayName: "Ilham",
            contacts: [{ vcard }],
        },
    });
}

/**
 * Display total menu count
 */
export async function totalmenu({ sock, msg }: CommandContext): Promise<void> {
    const total = Object.keys(FunctionCommand).length;
    await sock.sendMessage(msg.key?.remoteJid!, {
        text: `Total fitur saat ini adalah ${total}`,
    });
}

/**
 * Send bug report to owner
 */
export async function bug(
    { sock, msg }: CommandContext,
    message: string
): Promise<void> {
    await sock.sendMessage(`${BotConfig.Owner}@s.whatsapp.net`, {
        text: `[BUG REPORT]
From: *${msg.pushName}*
Jid: *${msg.key?.remoteJid}*
Pesan: _${message}_`,
    });
    await sock.sendMessage(msg.key?.remoteJid!, {
        text: "Pesan telah dikirim kepada owner bot!",
    });
}

/**
 * Alias for bug command
 */
export async function report(
    ctx: CommandContext,
    message: string
): Promise<void> {
    return bug(ctx, message);
}

/**
 * Module configuration
 */
export const Config = {
    menu: "Info",
};
