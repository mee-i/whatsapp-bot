const { store } = require('./memory-store.js');
const { FunctionCommand, FunctionDetails } = require('../config.js');
const { Config } = require('../config.js');
const { LoadMenu } = require('../load-menu.js');
const config_file = require('../utilities/database.js');
const db = require('../database');
const xp =  require('../utilities/xp.js');

function hasPrefix(command, prefixes) {
    return prefixes.some(prefix => command.startsWith(prefix));
}

function getCommandWithoutPrefix(command, prefixes) {
    for (const prefix of prefixes) {
        if (command.startsWith(prefix)) {
            return command.slice(prefix.length);
        }
    }
    return command;
}

var enable_bot = false;

async function Command(command, isGroup, sock, data) {
    if (typeof command !== 'string') {
        throw new TypeError('The "command" parameter must be a string.');
    }
    if (typeof isGroup !== 'boolean') {
        throw new TypeError('The "isGroup" parameter must be a boolean.');
    }

    if (data?.fromMe)
        return;
    
    const config = await config_file.Config.ReadConfig();
    const CommandOptions = config["CommandOptions"];

    if (!hasPrefix(command, CommandOptions["COMMAND-PREFIXES"]))
        return false;
    
    let Args = command.split(" ");
    const CommandWithoutPrefix = getCommandWithoutPrefix(Args[0], CommandOptions["COMMAND-PREFIXES"]);


    // console.log(CommandOptions, isGroup);
    if (CommandOptions["GROUP-ONLY"].includes(CommandWithoutPrefix) && isGroup == false) {
        await sock.sendMessage(data?.key?.remoteJid, { text: 'Sorry this command is only for group chat!' });
        return false;
    }

    if (CommandOptions["PRIVATE-ONLY"].includes(CommandWithoutPrefix) && isGroup == true) {
        await sock.sendMessage(data?.key?.remoteJid, { text: 'Sorry this command is only for private chat!' });
        return false;
    }

    const isOwner = (data?.key?.participant ? (Config.Owner == data?.key?.participant.replace("@s.whatsapp.net", "")) : (Config.Owner == data?.key?.remoteJid.replace("@s.whatsapp.net", "")));

    if (CommandWithoutPrefix == "reloadmenu" && isOwner) {
        await LoadMenu();
        await sock.sendMessage(data?.key?.remoteJid, { text: "Menu telah direload!"});
        return true;
    }

    if (CommandWithoutPrefix == "enablebot" && isOwner) {
        enable_bot = true;
        await sock.sendMessage(data?.key?.remoteJid, { text: "Bot telah diaktifkan!"});
        return true;
    }

    if (CommandWithoutPrefix == "disablebot" && isOwner) {
        enable_bot = false;
        await sock.sendMessage(data?.key?.remoteJid, { text: "Bot telah dinonaktifkan!"});
        return true;
    }

    // Do not read if not enabled, because when initial load, it will read all messages
    if (!enable_bot)
        return false;

    if (FunctionCommand[CommandWithoutPrefix]) {
        if (FunctionDetails[CommandWithoutPrefix].owneronly && !isOwner) {
            await sock.sendMessage(data?.key?.remoteJid, { text: "This command is only for bot owner!"});
            return false;
        }

        console.log(FunctionDetails[CommandWithoutPrefix]);

        if (FunctionDetails[CommandWithoutPrefix].admingroup && isGroup) {
            const metadata = await store.fetchGroupMetadata(data?.key?.jid, sock);
            let isAdmin = false;
            for (const participant of metadata.participants) {
                if (participant.id == data?.key?.participant) {
                    if (participant.admin == "superadmin" || participant.admin == "admin")
                        isAdmin = true;
                    break;
                }
            }
            if (!isAdmin)
                await sock.sendMessage(data?.key?.remoteJid, { text: "This command is only for group admin!"});
            return false;
        }

        if (FunctionDetails[CommandWithoutPrefix].admingroup && !isGroup) {
            await sock.sendMessage(data?.key?.remoteJid, { text: "This command is only for group chat!"});
            return false;
        }

        const Func = FunctionCommand[CommandWithoutPrefix];
        const FuncParameterLength = Func.length - 1;
        Args.shift();
        if ((Args.length) < FuncParameterLength) {
            await sock.sendMessage(data?.key?.remoteJid, { text: "Need more arguments!"});
        } else {
            if (FuncParameterLength === 1 && Args.length > 1) {
                Args = [Args.join(" ")];
            }
            
            const remoteJid = isGroup ? data?.key?.participant : data?.key?.remoteJid;
            const userdata = await db.sql.select().from(db.userTable).where(db.eq(db.userTable.id, remoteJid)).then(res => res.length == 1);
            if (!userdata) {
                await sock.sendMessage(data?.key?.remoteJid, { text: "Anda belum terdaftar di database, tunggu sebentar kami akan mendaftarkan anda secara otomatis..." });
                await db.sql.insert(db.userTable).values({
                    id: remoteJid,
                    name: data.pushName,
                    xp: 0,
                    level: 0,
                    premium: false
                });
                await sock.sendMessage(data?.key?.remoteJid, { text: "Daftar selesai!" });
            }

            await xp.add({remoteJid, sock, msg: data});
            
            try {
                const checkUserdata = await db.sql.select().from(db.userTable).where(db.eq(db.userTable.id, remoteJid)).then(res => res.length == 1);
                if (!checkUserdata)
                    await sock.sendMessage(data?.key?.remoteJid, { text: "Anda belum terdaftar di database, kesalahan kode?? Tunggu sebentar" });
                await db.sql.insert(db.commandLogTable).values({
                    id: remoteJid,
                    command: CommandWithoutPrefix,
                    isGroup: isGroup,
                    args: Args.join(" "),
                });
                await Func({sock, msg: data, isGroup}, ...Args);
            } catch (error) {
                await sock.sendMessage(data?.key?.remoteJid, { text: "Caught an error, please report to owner /bug <message>"});
                await sock.sendMessage(Config.Owner+"@s.whatsapp.net", { text: `[ERROR REPORT]
Command: *${CommandOptions["COMMAND-PREFIXES"][0]}${CommandWithoutPrefix}*
Error: _${error.message}_
Stack Trace: _${error.stack}_
                ` });
            }
        }
    }
    return true;
}

module.exports = {
    Command
};