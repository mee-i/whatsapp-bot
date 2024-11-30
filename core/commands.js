// const { text } = require('figlet');
const { FunctionCommand } = require('../config.js');
// const Terminal = require('./terminal.js')
const fs = require('node:fs');
const { Config } = require('../config.js');
// const { geminiNoWorker } = require('../modules/gemini.js');

function hasPrefix(command, prefixes) {
    return prefixes.some(prefix => command.startsWith(prefix));
}

function getParameterNames(fn) {
    const functionString = fn.toString();
    const result = functionString.match(/\(([^)]*)\)/);
    return result ? result[1].split(',').map(param => param.trim()) : [];
}

function getCommandWithoutPrefix(command, prefixes) {
    for (const prefix of prefixes) {
        if (command.startsWith(prefix)) {
            return command.slice(prefix.length);
        }
    }
    return command;
}

async function Command(command, isGroup, sock, data) {
    if (typeof command !== 'string') {
        throw new TypeError('The "command" parameter must be a string.');
    }
    if (typeof isGroup !== 'boolean') {
        throw new TypeError('The "isGroup" parameter must be a boolean.');
    }

    
    const datafile = fs.readFileSync("./cmd-config.json");
    const CommandOptions = JSON.parse(datafile);

    if (!hasPrefix(command, CommandOptions["COMMAND-PREFIXES"]))
        return false;
    
    let Args = command.split(" ");
    const CommandWithoutPrefix = getCommandWithoutPrefix(Args[0], CommandOptions["COMMAND-PREFIXES"]);

    if (CommandOptions["GROUP-ONLY"].includes(CommandWithoutPrefix) && isGroup == false) {
        await sock.sendMessage(data?.key?.remoteJid, { text: 'Sorry this command is only for group chat!' });
        return false;
    }

    if (CommandOptions["PRIVATE-ONLY"].includes(CommandWithoutPrefix) && isGroup == true) {
        await sock.sendMessage(data?.key?.remoteJid, { text: 'Sorry this command is only for private chat!' });
        return false;
    }

    if (CommandWithoutPrefix == "MakeMeAI" && Config.Owner == data?.key?.participant.replace("@s.whatsapp.net", ""))
    {
        Config.AIMessage.push(data?.key?.remoteJid);
        await sock.sendMessage(data?.key?.remoteJid, {text: "AI message *enabled* in this chat!"});
    }

    if (CommandWithoutPrefix == "StopAI" && Config.Owner == data?.key?.participant.replace("@s.whatsapp.net", ""))
        {
            if (Config.AIMessage.includes(data?.key?.remoteJid))
            {
                Config.AIMessage = Config.AIMessage.filter(item => item !== data?.key?.remoteJid);
                await sock.sendMessage(data?.key?.remoteJid, {text: "AI message *disabled* in this chat!"});
            } else
                await sock.sendMessage(data?.key?.remoteJid, {text: "This chat already *disabled*!"});
        }

    if (CommandWithoutPrefix == "menu" || CommandWithoutPrefix == "help")
    {
        const now = new Date();
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const formattedDate = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        let menu = `*MeeI Bot Menu!*
_Halo,_ *${data?.pushName}*
${formattedDate}

Ketik /menu atau /help untuk menampilkan list menu!
List Menu:
`;
        Object.keys(FunctionCommand).forEach(menuname => {
            menu += "*[ "+menuname+" ]*\n"
            Object.keys(FunctionCommand[menuname]).forEach(cmd => {
                const Params = getParameterNames(FunctionCommand[menuname][cmd]);
                Params.shift();
                Params.shift();
                menu += "- *" + CommandOptions["COMMAND-PREFIXES"][0] + cmd + "*";
                Params.forEach(element => {
                    menu += " <" + element + ">"
                });
                menu += "\n";
            });
            menu += "\n";
        });
        //This is footer
        menu += "";
        await sock.sendMessage(data?.key?.remoteJid, {
            image: { url: './media/MeeI-Bot.png' },
            caption: menu,
        });
    }

    Object.keys(FunctionCommand).forEach(async menuname => {
        if (FunctionCommand[menuname][CommandWithoutPrefix]) {
            const Func = FunctionCommand[menuname][CommandWithoutPrefix];
            const Params = getParameterNames(Func);
            const FuncParameterLength = Params.length - 2;
            if ((Args.length - 1) < FuncParameterLength) {
                await sock.sendMessage(data?.key?.remoteJid, { text: "Need more arguments!"});
            } else {
                Args.shift();
                if (FuncParameterLength === 1 && Args.length > 1) {
                    Args = [Args.join(" ")];
                }
                
                try {
                    await Func(sock, data?.key, ...Args);
                } catch (error) {
                    await sock.sendMessage(Config.Owner+"@s.whatsapp.net", { text: `[ERROR REPORT]
Command: *${CommandOptions["COMMAND-PREFIXES"][0]}${CommandWithoutPrefix}*
Menu: *${menuname}*
Error: _${error.message}_
Stack Trace: _${error.stack}_
                    ` });
                }
            }
        }
    })
    return true;
}

module.exports = {
    Command
};