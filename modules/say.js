
function say(sock, msg, text) {
    sock.sendMessage(msg?.key?.remoteJid, {text : text}, {quoted: msg});
};

module.exports = {
    say,
    Config: {
        say: {
            owneronly: true
        }
    }
};