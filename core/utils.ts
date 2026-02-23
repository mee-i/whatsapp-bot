export { downloadMediaMessage, getContentType } from "baileys";
import { downloadMediaMessage, getContentType } from "baileys";
import type { WASocket, proto } from "baileys";
import { createWriteStream, readFileSync, unlinkSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import ff from "fluent-ffmpeg";
import webp from "node-webpmux";
import pino from "pino";
import { Config } from "../config.ts";
import { store } from "./memory-store.js";

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

/**
 * Convert image/video to sticker using fluent-ffmpeg
 */
export const convertToSticker = async (inputPath: string, isVideo: boolean = false): Promise<Buffer> => {
    const outputPath = join(tmpdir(), `sticker_${randomBytes(4).toString("hex")}.webp`);
    
    await new Promise((resolve, reject) => {
        const command = ff(inputPath)
            .on("error", reject)
            .on("end", () => resolve(true));

        const outputOptions = [
            "-vcodec", "libwebp",
            "-vf", "scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,fps=15, pad=512:512:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
        ];
        
        if (isVideo) {
            outputOptions.push(
                "-loop", "0",
                "-ss", "00:00:00",
                "-t", "00:00:05",
                "-preset", "default",
                "-an",
                "-vsync", "0"
            );
        }

        command.addOutputOptions(outputOptions)
            .toFormat("webp")
            .save(outputPath);
    });

    const buffer = readFileSync(outputPath);
    if (existsSync(outputPath)) unlinkSync(outputPath);
    return buffer;
};

/**
 * Send sticker to JID with optional metadata using node-webpmux
 * Internally handles converting the media and cleaning up temporary files.
 */
export const sendSticker = async (
    sock: WASocket,
    jid: string,
    inputPath: string,
    options: { packname?: string; author?: string; packId?: string; isVideo?: boolean } = {},
    quoted?: proto.IWebMessageInfo
) => {
    const packname = options.packname || Config.Sticker.packName;
    const author = options.author || Config.Sticker.publisher;
    const packId = options.packId || Config.Sticker.packId;

    try {
        const webpBuffer = await convertToSticker(inputPath, options.isVideo);
        const tmpPath = join(tmpdir(), `exif_${randomBytes(4).toString("hex")}.webp`);
        writeFileSync(tmpPath, webpBuffer);

        const img = new webp.Image();
        await img.load(tmpPath);

    const json = {
        "sticker-pack-id": packId,
        "sticker-pack-name": packname,
        "sticker-pack-publisher": author,
        "emojis": [""]
    };

    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 
        0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);

        img.exif = exif;
        const finalBuffer = await img.save(null);
        
        if (existsSync(tmpPath)) unlinkSync(tmpPath);

        await sock.sendMessage(jid, { sticker: finalBuffer as Buffer }, { quoted: quoted as any });
    } finally {
        // Cleanup original downloaded media
        if (existsSync(inputPath)) unlinkSync(inputPath);
    }
};
