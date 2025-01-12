
function say(sock, msg, text) {
    sock.sendMessage(msg?.key?.remoteJid, {text : text}, {quoted: msg});
};

module.exports = {
    say,
    Config: {
        details: {
            say: {
                owneronly: true
            }
        }
    }
};