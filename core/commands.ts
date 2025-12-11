import type { WASocket, proto } from "baileys";
import { store } from "./memory-store.js";
import { Config } from "../config.js";
import { FunctionCommand, FunctionDetails, LoadMenu } from "../load-menu";
import { Config as ConfigFile } from "../utilities/database.js";
import { db, userTable, commandLogTable, eq } from "../database/index.js";
import * as xp from "../utilities/xp.js";
import {
    hasPrefix,
    getCommandWithoutPrefix,
    sendMessage,
    extractUserId,
    isOwner,
} from "./utils.js";

/**
 * Command context passed to command handlers
 */
interface CommandContext {
    sock: WASocket;
    msg: proto.IWebMessageInfo;
    isGroup: boolean;
}

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
 * Process and execute commands
 */
export async function Command(
    command: string,
    isGroup: boolean,
    sock: WASocket,
    data: proto.IWebMessageInfo
): Promise<boolean> {
    // Validate input types
    if (typeof command !== "string" || typeof isGroup !== "boolean") {
        throw new TypeError("Invalid parameter types");
    }

    // Ignore own messages
    if (data.key?.fromMe) return false;

    // Get command configuration
    const config = await ConfigFile.ReadConfig();
    const commandOptions = config["CommandOptions"];

    // Check if message has command prefix
    if (!hasPrefix(command, commandOptions["COMMAND-PREFIXES"])) {
        return false;
    }

    // Parse command and arguments
    const args = command.split(" ");
    const commandWithoutPrefix = getCommandWithoutPrefix(
        args[0],
        commandOptions["COMMAND-PREFIXES"]
    );
    const jid = data.key?.remoteJid;
    if (!jid) return false;

    const ownerStatus = isOwner(data, isGroup, Config.Owner);

    // Check group-only commands
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

    // Check private-only commands
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

    // Execute system commands (owner only)
    if (SYSTEM_COMMANDS[commandWithoutPrefix] && ownerStatus) {
        await SYSTEM_COMMANDS[commandWithoutPrefix](sock, jid);
        return true;
    }

    // Check if bot is enabled
    if (!enableBot) return false;

    // Check if command exists
    if (!FunctionCommand[commandWithoutPrefix]) return true;

    const funcDetails = FunctionDetails[commandWithoutPrefix];

    // Check owner-only commands
    if (funcDetails.owneronly && !ownerStatus) {
        await sendMessage(sock, jid, "This command is only for bot owner!");
        return false;
    }

    // Check admin-only commands
    if (funcDetails.admingroup) {
        if (!isGroup) {
            await sendMessage(
                sock,
                jid,
                "This command is only for group chat!"
            );
            return false;
        }

        const isAdmin = await checkGroupAdmin(data, sock);
        if (!isAdmin) {
            await sendMessage(
                sock,
                jid,
                "This command is only for group admin!"
            );
            return false;
        }
    }

    // Get command function and validate arguments
    const func = FunctionCommand[commandWithoutPrefix];
    const requiredArgs = func.length - 1;
    args.shift(); // Remove command name

    if (args.length < requiredArgs) {
        await sendMessage(sock, jid, "Need more arguments!");
        return false;
    }

    // Process arguments
    const processedArgs =
        requiredArgs === 1 && args.length > 1 ? [args.join(" ")] : args;
    const userId = extractUserId(data, isGroup);
    if (!userId) return false;

    // Validate user in database
    await validateUserInDatabase(userId, data.pushName || "Unknown", sock, jid);
    await xp.add({ remoteJid: userId, sock, msg: data });

    // Execute command
    try {
        await logCommand(userId, commandWithoutPrefix, isGroup, processedArgs);
        await func({ sock, msg: data, isGroup }, ...processedArgs);
    } catch (error) {
        await sendMessage(
            sock,
            jid,
            "Caught an error, please report to owner /bug <message>"
        );
        await sendMessage(
            sock,
            `${Config.Owner}@s.whatsapp.net`,
            `[ERROR REPORT]\nCommand: *${
                commandOptions["COMMAND-PREFIXES"][0]
            }${commandWithoutPrefix}*\nError: _${
                (error as Error).message
            }_\nStack Trace: _${(error as Error).stack}_`
        );
    }

    return true;
}
