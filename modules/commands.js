const { text } = require('figlet');
const { FunctionCommand } = require('../config');
const Terminal = require('./utilities/terminal')
const fs = require('fs');

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

async function Command(command, isGroup, sock, key) {
    if (typeof command !== 'string') {
        throw new TypeError('The "command" parameter must be a string.');
    }
    if (typeof isGroup !== 'boolean') {
        throw new TypeError('The "isGroup" parameter must be a boolean.');
    }

    
    const data = fs.readFileSync("./cmd-config.json");
    const CommandOptions = JSON.parse(data);

    if (!hasPrefix(command, CommandOptions["COMMAND-PREFIXES"]))
        return false;

    

    if (CommandOptions["GROUP-ONLY"].includes(command) && isGroup == false) {
        await sock.sendMessage(key?.remoteJid, { text: 'Sorry this command is only for group chat!' });
        return false;
    }

    if (CommandOptions["PRIVATE-ONLY"].includes(command) && isGroup == true) {
        await sock.sendMessage(key?.remoteJid, { text: 'Sorry this command is only for private chat!' });
        return false;
    }

    let Args = command.split(" ");
    let CommandWithoutPrefix = getCommandWithoutPrefix(Args[0], CommandOptions["COMMAND-PREFIXES"]);
    if (FunctionCommand[CommandWithoutPrefix]) {
        const Func = FunctionCommand[CommandWithoutPrefix];
        const Params = getParameterNames(Func);
        const FuncParameterLength = Params.length - 2;
        if ((Args.length - 1) < FuncParameterLength) {
            await sock.sendMessage(key?.remoteJid, { text: "Need more arguments!"});
        } else {
            try {
                Args.shift();
                if (FuncParameterLength === 1 && Args.length > 1) {
                    Args = [Args.join(" ")];
                }

                await Func(sock, key, ...Args);
            } catch (error) {
                await sock.sendMessage(key?.remoteJid, { text: `Error executing command: ${error.message}` });
            }
        }
    }
    return true;
}

module.exports = {
    Command
};