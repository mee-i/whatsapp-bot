import { type WASocket, proto, type BaileysEventMap } from "baileys";
import { terminal } from "@utils/terminal.js";
import { colors } from "@utils/colors.js";
import { Config as ConfigFile } from "@utils/runtime-config";
import { Command } from "@core/commands";
import { store } from "@core/memory-store";
import { Config } from "@/config";
import { AutoFunction, type MediaOptions } from "@core/menu";
import { hasPrefix, extractMessageText, createMessagingHelpers, checkGroupAdmin } from "@core/utils";

/**
 * Create logger for messages
 */
const createLogger = (
    isGroup: boolean,
    remoteJid: string,
    pushName: string
) => {
    const prefix = `[${colors.FgCyan}${isGroup ? "GC" : "PC"}${
        colors.FgGreen
    }][${remoteJid}][${pushName}]: `;
    return (message: string) => terminal.Log(prefix + message);
};

/**
 * Check if message should be skipped
 */
const shouldSkipProcessing = (data: proto.IWebMessageInfo): boolean => {
    return (
        data.status === proto.WebMessageInfo.Status.PENDING ||
        !!data.key?.fromMe
    );
};

/**
 * Process auto functions for message
 */
const processAutoFunctions = async (
    data: proto.IWebMessageInfo,
    text: string,
    isGroup: boolean,
    sock: WASocket,
    args: string[],
    helpers: { reply: (content: string | MediaOptions) => Promise<void>; send: (content: string | MediaOptions) => Promise<void> }
): Promise<void> => {
    const promises = Object.values(AutoFunction).map(async (fn) => {
        // Owner bypass
        const ownerStatus = text && Config.Owner && (data.key?.participant || data.key?.remoteJid)?.includes(Config.Owner);
        
        if (fn.groupOnly && !isGroup) return;
        if (fn.privateOnly && isGroup) return;

        // If it's a group and flags are set, check them
        if (isGroup) {
            if (fn.adminGroup && !ownerStatus) {
                const isAdmin = await checkGroupAdmin(data, sock);
                if (!isAdmin) return;
            }

            if (fn.requireBotAdmin) {
                const jid = data.key?.remoteJid;
                if (!jid) return;
                const botId = sock.user?.id?.split(":")[0] + "@lid";
                const metadata = await store.fetchGroupMetadata(jid, sock);
                const botParticipant = metadata?.participants.find((p: any) => p.id === botId);
                const botIsAdmin = botParticipant?.admin === "admin" || botParticipant?.admin === "superadmin";
                if (!botIsAdmin) return;
            }
        }

        return fn({ sock, msg: data, text, isGroup, args, ...helpers });
    });
    await Promise.all(promises);
};

/**
 * Handle incoming message events
 */
export async function MessageEventsHandler(
    rawdata: BaileysEventMap["messages.upsert"],
    sock: WASocket
): Promise<void> {
    if (!rawdata.messages) return;

    const { CommandOptions: commandOptions, Typing: typingConfig } = await ConfigFile.ReadConfig();

    await Promise.all(
        rawdata.messages.map(async (data) => {
            const text = extractMessageText(data.message);
            const isGroup = data.key?.remoteJid?.includes("@g.us") ?? false;
            const log = createLogger(
                isGroup,
                data.key?.remoteJid ?? "",
                data.pushName ?? "Unknown"
            );

            // Read message if enabled
            if (Config.ReadMessage) {
                await sock.readMessages([data.key]);
            }

            // Skip processing if needed
            if (shouldSkipProcessing(data)) return;

            const { reply, send } = createMessagingHelpers(
                sock,
                data.key?.remoteJid ?? "",
                data,
                typingConfig
            );

            // Process auto functions
            await processAutoFunctions(data, text, isGroup, sock, [""], {
                reply,
                send,
            });

            // Check if text is valid
            if (typeof text !== "string") {
                log(
                    `${colors.FgRed}This message contains empty message, no handling will be done.`
                );
                return;
            }

            // Handle commands
            if (hasPrefix(text, commandOptions["COMMAND-PREFIXES"])) {
                log(`${colors.FgYellow}${text}`);
                await Command(text, isGroup, sock, data);
            } else {
                log(`${colors.FgWhite}${text}`);
            }
        })
    );
}
