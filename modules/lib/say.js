function say(sock, key, text) {
    sock.sendMessage(key.remoteJid, {text : text})
};

module.exports = {
    say
};