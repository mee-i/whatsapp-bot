import type { WASocket, proto } from "baileys";

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
 * Send text message to JID
 */
export const sendMessage = async (
    sock: WASocket,
    jid: string,
    text: string
): Promise<void> => {
    await sock.sendMessage(jid, { text });
};

/**
 * Extract user ID from message data
 */
export const extractUserId = (
    data: proto.IWebMessageInfo,
    isGroup: boolean
): string | undefined => {
    return isGroup ? data.key?.participant : data.key?.remoteJid;
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
    return ownerNumber === userId?.replace("@s.whatsapp.net", "");
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
