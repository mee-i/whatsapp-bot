const { store } = require('./memory-store.js');
const { FunctionCommand, FunctionDetails } = require('../config.js');
const { Config } = require('../config.js');
const { LoadMenu } = require('../load-menu.js');
const config_file = require('../utilities/database.js');
const { db, userTable, commandLogTable, eq } = require('../database');
const xp = require('../utilities/xp.js');

const hasPrefix = (command, prefixes) => 
    prefixes.some(prefix => command.startsWith(prefix));

const getCommandWithoutPrefix = (command, prefixes) => {
    const prefix = prefixes.find(p => command.startsWith(p));
    return prefix ? command.slice(prefix.length) : command;
};

const sendMessage = async (sock, jid, text) => 
    await sock.sendMessage(jid, { text });

const extractUserId = (data, isGroup) => 
    isGroup ? data?.key?.participant : data?.key?.remoteJid;

const isOwner = (data, isGroup) => {
    const userId = extractUserId(data, isGroup);
    return Config.Owner === userId?.replace("@s.whatsapp.net", "");
};

const validateUserInDatabase = async (userId, pushName, sock, jid) => {
    const userExists = await db.select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .then(res => res.length === 1);

    if (!userExists) {
        await sendMessage(sock, jid, "Anda belum terdaftar di database, tunggu sebentar kami akan mendaftarkan anda secara otomatis...");
        await db.insert(userTable).values({
            id: userId,
            name: pushName,
            xp: 0,
            level: 0,
            premium: false
        });
        await sendMessage(sock, jid, "Daftar selesai!");
    }
};

const checkGroupAdmin = async (data, sock) => {
    const metadata = await store.fetchGroupMetadata(data?.key?.jid, sock);
    const participant = metadata.participants.find(p => p.id === data?.key?.participant);
    return participant?.admin === "superadmin" || participant?.admin === "admin";
};

const logCommand = async (userId, commandName, isGroup, args) => {
    await db.insert(commandLogTable).values({
        id: userId,
        command: commandName,
        isGroup,
        args: args.join(" ")
    });
};

let enable_bot = false;

const SYSTEM_COMMANDS = {
    reloadmenu: async (sock, jid) => {
        await LoadMenu();
        await sendMessage(sock, jid, "Menu telah direload!");
    },
    enablebot: async (sock, jid) => {
        enable_bot = true;
        await sendMessage(sock, jid, "Bot telah diaktifkan!");
    },
    disablebot: async (sock, jid) => {
        enable_bot = false;
        await sendMessage(sock, jid, "Bot telah dinonaktifkan!");
    }
};

async function Command(command, isGroup, sock, data) {
    if (typeof command !== 'string' || typeof isGroup !== 'boolean') {
        throw new TypeError('Invalid parameter types');
    }

    if (data?.fromMe) return;

    const config = await config_file.Config.ReadConfig();
    const commandOptions = config["CommandOptions"];

    if (!hasPrefix(command, commandOptions["COMMAND-PREFIXES"])) return false;

    const args = command.split(" ");
    const commandWithoutPrefix = getCommandWithoutPrefix(args[0], commandOptions["COMMAND-PREFIXES"]);
    const jid = data?.key?.remoteJid;
    const ownerStatus = isOwner(data, isGroup);

    if (commandOptions["GROUP-ONLY"].includes(commandWithoutPrefix) && !isGroup) {
        await sendMessage(sock, jid, 'Sorry this command is only for group chat!');
        return false;
    }

    if (commandOptions["PRIVATE-ONLY"].includes(commandWithoutPrefix) && isGroup) {
        await sendMessage(sock, jid, 'Sorry this command is only for private chat!');
        return false;
    }

    if (SYSTEM_COMMANDS[commandWithoutPrefix] && ownerStatus) {
        await SYSTEM_COMMANDS[commandWithoutPrefix](sock, jid);
        return true;
    }

    if (!enable_bot) return false;

    if (!FunctionCommand[commandWithoutPrefix]) return true;

    const funcDetails = FunctionDetails[commandWithoutPrefix];
    
    if (funcDetails.owneronly && !ownerStatus) {
        await sendMessage(sock, jid, "This command is only for bot owner!");
        return false;
    }

    if (funcDetails.admingroup) {
        if (!isGroup) {
            await sendMessage(sock, jid, "This command is only for group chat!");
            return false;
        }
        
        const isAdmin = await checkGroupAdmin(data, sock);
        if (!isAdmin) {
            await sendMessage(sock, jid, "This command is only for group admin!");
            return false;
        }
    }

    const func = FunctionCommand[commandWithoutPrefix];
    const requiredArgs = func.length - 1;
    args.shift();

    if (args.length < requiredArgs) {
        await sendMessage(sock, jid, "Need more arguments!");
        return false;
    }

    const processedArgs = requiredArgs === 1 && args.length > 1 ? [args.join(" ")] : args;
    const userId = extractUserId(data, isGroup);

    await validateUserInDatabase(userId, data.pushName, sock, jid);
    await xp.add({ remoteJid: userId, sock, msg: data });

    try {
        await logCommand(userId, commandWithoutPrefix, isGroup, processedArgs);
        await func({ sock, msg: data, isGroup }, ...processedArgs);
    } catch (error) {
        await sendMessage(sock, jid, "Caught an error, please report to owner /bug <message>");
        await sendMessage(sock, `${Config.Owner}@s.whatsapp.net`, 
            `[ERROR REPORT]\nCommand: *${commandOptions["COMMAND-PREFIXES"][0]}${commandWithoutPrefix}*\nError: _${error.message}_\nStack Trace: _${error.stack}_`
        );
    }

    return true;
}

module.exports = { Command };