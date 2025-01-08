module.exports = {
    katakasar: async ({ sock, msg, text }) => {
        const katakasar = [
            "bodoh", "goblok", "tolol", "bangsat", "brengsek", "sialan", "anjing", "babi", "setan", "kampret",
            "bejat", "laknat", "pecundang", "dungu", "edun", "sontoloyo", "keparat", "bangkrut", "parasit", "konyol", "sampah", "bego", "bacot", "kontol", "memek", "gila", "sinting", "monyet", "pengkhianat", "palsu", "gembel", "jelek", "burik",
            "tengik", "cebol", "pelit", "pelacur", "lonte", "cupu", "ngentot",
            "pecun", "tai", "busuk", "brengsek", "seonggok", "cacing", "lemah", "pemalas",
            "sombong", "banci", "cerewet", "nyinyir", "norak", "kntl", "mmk", "pussy", "nigger", "nigga", "niger", "niga", "ngtd", "fuck", "fck", "wtf", "shit", "sht", "anjg"
        ];
        for (const kata of katakasar)
            if (text.toLowerCase().includes(kata)) {
                await sock.sendMessage(msg?.key?.remoteJid, { text: "Jangan berkata kasar brow!"}, {quoted: msg});
                return;
            }
    }
}