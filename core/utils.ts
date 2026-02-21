export { downloadMediaMessage, getContentType } from "baileys";
import { downloadMediaMessage, getContentType } from "baileys";
import type { WASocket, proto } from "baileys";
import { createWriteStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import pino from "pino";

const logger = pino({ level: "silent" });

/**
 * Message utilities for extracting and processing WhatsApp messages
 */

/**
 * Check if command has any of the given prefixes
 */
export const hasPrefix = (command: string, prefixes: string[]): boolean =>
    prefixes.some((prefix) => command.startsWith(prefix));

/**
 * Remove prefix from command
 */
export const getCommandWithoutPrefix = (
    command: string,
    prefixes: string[]
): string => {
    const prefix = prefixes.find((p) => command.startsWith(p));
    return prefix ? command.slice(prefix.length) : command;
};

/**
 * Delay execution for a specified duration
 */
export const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Typing configuration
 */
export interface TypingConfig {
    Simulate: boolean;
    WritePerMinute: number;
}

/**
 * Simulate human typing behavior
 */
export const simulateTyping = async (
    sock: WASocket,
    jid: string,
    text?: string,
    typingConfig?: TypingConfig
) => {
    if (typingConfig?.Simulate) {
        const wpm = typingConfig.WritePerMinute || 100;
        const charsPerSecond = (wpm * 5) / 60;
        const typingDuration = text ? (text.length / charsPerSecond) * 1000 : 2000;

        await sock.sendPresenceUpdate("composing", jid);
        await delay(Math.min(typingDuration, 5000));
        await sock.sendPresenceUpdate("paused", jid);
    }
};

/**
 * Get media type from extension
 */
const getMediaTypeFromExtension = (path: string): "video" | "audio" | "image" | "document" => {
    const ext = path.split(".").pop()?.toLowerCase();
    if (!ext) return "document";
    if (["mp4", "mkv", "mov"].includes(ext)) return "video";
    if (["mp3", "m4a", "wav", "ogg"].includes(ext)) return "audio";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
    return "document";
};

/**
 * Create messaging helpers for a context
 */
export const createMessagingHelpers = (
    sock: WASocket,
    jid: string,
    data: proto.IWebMessageInfo,
    typingConfig?: TypingConfig
) => {
    const reply = async (content: string | any) => {
        await sendMessage(sock, jid, content, typingConfig, { quoted: data as any });
    };

    const send = async (content: string | any) => {
        await sendMessage(sock, jid, content, typingConfig);
    };

    return { reply, send };
};

/**
 * Send text or media message to JID
 */
export const sendMessage = async (
    sock: WASocket,
    jid: string,
    content: string | any,
    typingConfig?: TypingConfig,
    options: any = {}
): Promise<void> => {
    if (typeof content === "string") {
        await simulateTyping(sock, jid, content, typingConfig);
        await sock.sendMessage(jid, { text: content }, options);
    } else {
        const mediaOptions = content;
        await simulateTyping(sock, jid, mediaOptions.caption, typingConfig);

        const sendOptions: any = { ...options };
        if (mediaOptions.viewOnce) sendOptions.viewOnce = true;

        const messageData: any = {
            caption: mediaOptions.caption,
        };

        if (mediaOptions.gif) messageData.gifPlayback = true;

        const mediaSource = typeof mediaOptions.media === "string" ? { url: mediaOptions.media } : mediaOptions.media;

        if (mediaOptions.asFile || mediaOptions.asDocument) {
            messageData.document = mediaSource;
            // Extract filename from URL/path if possible
            if (typeof mediaOptions.media === "string") {
                const fileName = mediaOptions.media.split(/[/\\]/).pop();
                messageData.fileName = fileName;
                // Simple extension based mimetype
                const ext = fileName?.split(".").pop()?.toLowerCase();
                if (ext === "mp3") messageData.mimetype = "audio/mpeg";
                else if (ext === "pdf") messageData.mimetype = "application/pdf";
            }
        } else {
            const type = typeof mediaOptions.media === "string" ? getMediaTypeFromExtension(mediaOptions.media) : "image";
            messageData[type] = mediaSource;
            if (type === "audio") messageData.mimetype = "audio/mp4";
        }

        await sock.sendMessage(jid, messageData, sendOptions);
    }
};

/**
 * Extract user ID from message data
 */
export const extractUserId = (
    data: proto.IWebMessageInfo,
    isGroup: boolean
): string => {
    return isGroup ? data.key?.participant! : data.key?.remoteJid!;
};

/**
 * Check if user is bot owner
 */
export const isOwner = (
    data: proto.IWebMessageInfo,
    isGroup: boolean,
    ownerNumber: string
): boolean => {
    const userId = extractUserId(data, isGroup);
    return ownerNumber === userId.replace("@lid", "");
};

/**
 * Extract message text from various message types
 */
export const extractMessageText = (
    message: proto.IMessage | null | undefined
): string => {
    if (!message) return "";

    return (
        message.extendedTextMessage?.text ||
        message.conversation ||
        message.imageMessage?.caption ||
        message.documentWithCaptionMessage?.message?.documentMessage?.caption ||
        ""
    );
};

/**
 * Download media message and return temporary file path
 */
export const downloadMedia = async (
    msg: proto.IWebMessageInfo,
    sock: WASocket
): Promise<string | null> => {
    const message = msg.message;
    if (!message) return null;

    const messageType = getContentType(message);
    if (
        !messageType ||
        (messageType !== "imageMessage" && messageType !== "videoMessage")
    ) {
        return null;
    }

    try {
        const stream = await downloadMediaMessage(
            msg as any,
            "stream",
            {},
            {
                logger,
                reuploadRequest: sock.updateMediaMessage,
            }
        );

        const ext = messageType === "imageMessage" ? "jpeg" : "mp4";
        const fileName = `${randomBytes(8).toString("hex")}.${ext}`;
        const filePath = join(tmpdir(), fileName);
        const writeStream = createWriteStream(filePath);

        return new Promise((resolve, reject) => {
            stream.pipe(writeStream);
            writeStream.on("finish", () => resolve(filePath));
            writeStream.on("error", (err) => reject(err));
        });
    } catch (error) {
        console.error("Error downloading media:", error);
        return null;
    }
};

/**
 * Check if user is group admin
 */
export const checkGroupAdmin = async (
    data: proto.IWebMessageInfo,
    sock: WASocket
): Promise<boolean> => {
    const jid = data.key?.remoteJid;
    if (!jid) return false;

    const { store } = require("@core/memory-store");
    const metadata = await store.fetchGroupMetadata(jid, sock);
    if (!metadata) return false;

    console.log(JSON.stringify(metadata, null, 2));

    const participant = metadata.participants.find(
        (p: any) => p.id === (data.key?.participant || data.key?.remoteJid)
    );
    return (
        participant?.admin === "superadmin" || participant?.admin === "admin"
    );
};
