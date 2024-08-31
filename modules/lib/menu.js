const { text } = require("figlet");


const menu = (sock, key) => {
    sock.sendMessage(key.remoteJid, {text : "This is menu."});
}

const say = (sock, key, text) => {
    sock.sendMessage(key.remoteJid, {text : text})
}
module.exports = {
    menu,
    say
};