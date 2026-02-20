import type { WASocket, proto } from "baileys";
import { store } from "@core/memory-store";
import { Config } from "@/config";
import { FunctionCommand, FunctionDetails, LoadMenu } from "@core/menu";
import { Config as ConfigFile } from "@utils/runtime-config";
import { db, userTable, commandLogTable, eq } from "@database/index.js";
import * as xp from "@utilities/xp";
import {
    hasPrefix,
    getCommandWithoutPrefix,
    sendMessage,
    extractUserId,
    isOwner,
    createMessagingHelpers,
    downloadMedia,
    getContentType,
} from "@core/utils";

/**
 * System command handler type
 */
type SystemCommandHandler = (sock: WASocket, jid: string) => Promise<void>;

/**
 * Validate user exists in database, create if not
 */
const validateUserInDatabase = async (
    userId: string,
    pushName: string,
    sock: WASocket,
    jid: string
): Promise<void> => {
    const userExists = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .then((res) => res.length === 1);

    if (!userExists) {
        await sendMessage(
            sock,
            jid,
            "Anda belum terdaftar di database, tunggu sebentar kami akan mendaftarkan anda secara otomatis..."
        );
        await db.insert(userTable).values({
            id: userId,
            name: pushName,
            xp: 0,
            level: 0,
            premium: false,
        });
        await sendMessage(sock, jid, "Daftar selesai!");
    }
};

/**
 * Check if user is group admin
 */
const checkGroupAdmin = async (
    data: proto.IWebMessageInfo,
    sock: WASocket
): Promise<boolean> => {
    const jid = data.key?.remoteJid;
    if (!jid) return false;

    const metadata = await store.fetchGroupMetadata(jid, sock);
    if (!metadata) return false;

    const participant = metadata.participants.find(
        (p: any) => p.id === data.key?.participant
    );
    return (
        participant?.admin === "superadmin" || participant?.admin === "admin"
    );
};

/**
 * Log command execution to database
 */
const logCommand = async (
    userId: string,
    commandName: string,
    isGroup: boolean,
    args: string[]
): Promise<void> => {
    await db.insert(commandLogTable).values({
        id: userId,
        command: commandName,
        isGroup,
        args: args.join(" "),
    });
};

/**
 * Bot enable state (TODO: move to database)
 */
let enableBot = false;

/**
 * System commands (owner only)
 */
const SYSTEM_COMMANDS: Record<string, SystemCommandHandler> = {
    reloadmenu: async (sock, jid) => {
        await LoadMenu();
        await sendMessage(sock, jid, "Menu telah direload!");
    },
    enablebot: async (sock, jid) => {
        enableBot = true;
        await sendMessage(sock, jid, "Bot telah diaktifkan!");
    },
    disablebot: async (sock, jid) => {
        enableBot = false;
        await sendMessage(sock, jid, "Bot telah dinonaktifkan!");
    },
};

/**
 * Check if user has required permissions
 */
const checkPermission = async (
    permissions: string[],
    data: proto.IWebMessageInfo,
    sock: WASocket,
    isGroup: boolean,
    configOwner: string
): Promise<boolean> => {
    // If no permission required or includes 'all', allow
    if (
        !permissions ||
        permissions.length === 0 ||
        permissions.includes("all") ||
        permissions.includes("global")
    ) {
        return true;
    }

    const jid = data.key?.remoteJid;
    if (!jid) return false;

    // Owner check
    const ownerStatus = isOwner(data, isGroup, configOwner);
    if (permissions.includes("owner")) {
        if (ownerStatus) return true;
    }

    // Admin check (bot admin)
    if (permissions.includes("admin")) {
        if (ownerStatus) return true;
    }

    // Group checks
    if (isGroup) {
        // user_group_admin
        if (permissions.includes("user_group_admin")) {
            const isAdmin = await checkGroupAdmin(data, sock);
            if (isAdmin) return true;
        }

        // self_group_admin
        if (permissions.includes("self_group_admin")) {
            const botId = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
            const metadata = await store.fetchGroupMetadata(jid, sock);
            const botParticipant = metadata?.participants.find(
                (p: any) => p.id === botId
            );
            if (
                botParticipant?.admin === "admin" ||
                botParticipant?.admin === "superadmin"
            ) {
                return true;
            }
        }
    }

    return false;
};

/**
 * Process and execute commands
 */
export async function Command(
    command: string,
    isGroup: boolean,
    sock: WASocket,
    data: proto.IWebMessageInfo
): Promise<boolean> {
    if (typeof command !== "string" || typeof isGroup !== "boolean") {
        throw new TypeError("Invalid parameter types");
    }

    if (data.key?.fromMe) return false;

    const config = await ConfigFile.ReadConfig();
    const commandOptions = config["CommandOptions"];
    const typingConfig = config["Typing"];

    if (!hasPrefix(command, commandOptions["COMMAND-PREFIXES"])) {
        return false;
    }

    const args = command.split(" ");
    const commandWithoutPrefix = getCommandWithoutPrefix(
        args[0],
        commandOptions["COMMAND-PREFIXES"]
    );
    const jid = data.key?.remoteJid;
    if (!jid) return false;

    const ownerStatus = isOwner(data, isGroup, Config.Owner);

    if (
        commandOptions["GROUP-ONLY"].includes(commandWithoutPrefix) &&
        !isGroup
    ) {
        await sendMessage(
            sock,
            jid,
            "Sorry this command is only for group chat!"
        );
        return false;
    }

    if (
        commandOptions["PRIVATE-ONLY"].includes(commandWithoutPrefix) &&
        isGroup
    ) {
        await sendMessage(
            sock,
            jid,
            "Sorry this command is only for private chat!"
        );
        return false;
    }

    if (SYSTEM_COMMANDS[commandWithoutPrefix] && ownerStatus) {
        await SYSTEM_COMMANDS[commandWithoutPrefix](sock, jid);
        return true;
    }
    if (!enableBot) return false;

    if (!FunctionCommand[commandWithoutPrefix]) return true;

    const funcDetails = FunctionDetails[commandWithoutPrefix];
    const permissions = funcDetails.permission || [];
    const hasPerm = await checkPermission(
        permissions,
        data,
        sock,
        isGroup,
        Config.Owner
    );
    if (!hasPerm) {
        if (permissions.includes("owner") && !ownerStatus) {
            await sendMessage(sock, jid, "This command is only for bot owner!");
        } else if (permissions.includes("user_group_admin") && isGroup) {
            await sendMessage(
                sock,
                jid,
                "This command is only for group admin!"
            );
        } else if (permissions.includes("self_group_admin") && isGroup) {
            await sendMessage(
                sock,
                jid,
                "Bot must be admin to use this command!"
            );
        } else {
            await sendMessage(
                sock,
                jid,
                "You do not have permission to use this command."
            );
        }
        return false;
    }

    const func = FunctionCommand[commandWithoutPrefix];
    const requiredArgs = func.length - 1;
    args.shift();

    if (args.length < requiredArgs) {
        const usage =
            funcDetails.usage ||
            `${commandOptions["COMMAND-PREFIXES"][0]}${commandWithoutPrefix}`;
        await sendMessage(sock, jid, `Need more arguments! Usage: ${usage}`);
        return false;
    }

    const processedArgs =
        requiredArgs === 1 && args.length > 1 ? [args.join(" ")] : args;
    const userId = extractUserId(data, isGroup);
    if (!userId) return false;
    await validateUserInDatabase(userId, data.pushName || "Unknown", sock, jid);
    await xp.add({ remoteJid: userId, sock, msg: data });

    const { reply, send } = createMessagingHelpers(
        sock,
        jid,
        data,
        typingConfig
    );

    let mediaPath: string | undefined;
    if (funcDetails.requireImage || funcDetails.requireVideo) {
        const messageType = getContentType(data.message as any);
        const isImage = messageType === "imageMessage";
        const isVideo = messageType === "videoMessage";

        if (funcDetails.requireImage && !isImage) {
            await reply("This command requires an image! Please send an image with the command.");
            return false;
        }

        if (funcDetails.requireVideo && !isVideo) {
            await reply("This command requires a video! Please send a video with the command.");
            return false;
        }

        mediaPath = (await downloadMedia(data, sock)) || undefined;
        if (!mediaPath) {
            await reply("Failed to download media. Please try again.");
            return false;
        }
    }

    try {
        await logCommand(userId, commandWithoutPrefix, isGroup, processedArgs);
        const result = await func(
            {
                sock,
                msg: data,
                isGroup,
                args: processedArgs,
                reply,
                send,
                mediaPath,
            },
            ...processedArgs
        );

        if (result) {
            await reply(result);
        }
    } catch (error) {
        await sendMessage(
            sock,
            jid,
            "Caught an error, auto report to owner ✅",
            typingConfig
        );
        await sendMessage(
            sock,
            `${Config.Owner}@lid`,
            `[ERROR REPORT]\nCommand: *${
                commandOptions["COMMAND-PREFIXES"][0]
            }${commandWithoutPrefix}*\nError: _${
                (error as Error).message
            }_\nStack Trace: _${(error as Error).stack}_`,
            typingConfig
        );
    }

    return true;
}
