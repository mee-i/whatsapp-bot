

function trimIndent(text) {
    const lines = text.split("\n"); // Pisahkan menjadi baris
    const nonEmptyLines = lines.filter(line => line.trim().length > 0); // Hapus baris kosong
    const indentLengths = nonEmptyLines.map(line => line.match(/^(\s*)/)[0].length); // Hitung spasi awal
    const minIndent = Math.min(...indentLengths); // Ambil indentasi minimum

    // Potong indentasi minimum dari setiap baris
    return lines.map(line => line.slice(minIndent)).join("\n").trim();
}

module.exports = {
    suit: async (sock, msg, opsi) => {
        const rock = ["b", "batu", "r", "rock", "🪨", "🗿"];
        const paper = ["p", "paper", "kertas", "k", "📃", "📄"];
        const scissor = ["s", "scissor", "g", "gunting", "✂️"];

        opsi = opsi.trim().toLowerCase();
        let option = "none";
        for (const keyword of rock) {
            if (opsi == keyword) {
                option = "rock";
                break;
            }
        }
        for (const keyword of paper) {
            if (opsi == keyword) {
                option = "paper";
                break;
            }
        }
        for (const keyword of scissor) {
            if (opsi == keyword) {
                option = "scissor";
                break;
            }
        }
        if (option == "none") {
            await sock.sendMessage(msg?.key?.remoteJid, { text: "Pilih antara rock, paper, atau scissor!" }, { quoted: msg });
            return;
        }
        const bot_options = ["rock", "paper", "scissor"][Math.round(Math.random() * 2)];
        const reply = async (option1, option2, message) => {
            await sock.sendMessage(msg?.key?.remoteJid, {
                text: trimIndent(`
                    Your option: ${option1}
                    Bot: ${option2}
                    ${message}
                `)
            })
        }
        const convertToEmoji = (c) => {
            switch (c) {
                case "rock":
                    return "🪨";
                case "paper":
                    return "📄";
                case "scissor":
                    return "✂️";
            }
        }
        const lose = async () => {
            await reply(convertToEmoji(option), convertToEmoji(bot_options), "You lose!");
        }
        const win = async () => {
            await reply(convertToEmoji(option), convertToEmoji(bot_options), "You win!");
        }
        if (option == bot_options) {
            await reply(convertToEmoji(option), convertToEmoji(bot_options), "Draw!");
        }
        if (option == "rock" && bot_options == "paper") {
            await lose();
            return;
        }
        if (option == "rock" && bot_options == "scissor") {
            await win();
            return;
        }
        if (option == "paper" && bot_options == "rock") {
            await win();
            return;
        }
        if (option == "paper" && bot_options == "scissor") {
            await lose();
            return;
        }
        if (option == "scissor" && bot_options == "rock") {
            await lose();
            return;
        }
        if (option == "scissor" && bot_options == "paper") {
            await win();
            return;
        }
    },
    Config: {
        menu: "Game"
    }
}