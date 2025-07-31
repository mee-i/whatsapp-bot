module.exports = {
    katakasar: async ({ sock, msg, text }) => {
        const katakasar = [
            "bodoh", "goblok", "tolol", "bangsat", "brengsek", "sialan", "anjing", "babi", "setan", "kampret",
            "bejat", "laknat", "pecundang", "dungu", "edun", "sontoloyo", "keparat", "bangkrut", "parasit", "konyol", "sampah", "bego", "bacot", "kontol", "memek", "gila", "sinting", "monyet", "pengkhianat", "palsu", "gembel", "jelek", "burik",
            "tengik", "cebol", "pelit", "pelacur", "lonte", "cupu", "ngentot",
            "pecun", "tai", "busuk", "brengsek", "seonggok", "cacing", "lemah", "pemalas",
            "sombong", "banci", "cerewet", "nyinyir", "norak", "kntl", "mmk", "pussy", "nigger", "nigga", "niger", "niga", "ngtd", "fuck", "fck", "wtf", "shit", "sht", "anjg",
            "damn",
            "hell",
            "crap",
            "bastard",
            "idiot",
            "stupid",
            "fool",
            "dumb",
            "moron",
            "jerk",
            "ass",
            "sucks",
            "loser",
            "shutup",
            "shut up",
            "screw you",
            "freak",
            "retard",
            "piss",
            "suck",
            "scum",
            "trash",
            "dick",
            "prick",
            "bitch",
            "slut",
            "whore",
            "arse",
            "bloody",
            "bollocks",
            "wanker", "wiener"
        ];
        for (const kata of katakasar)
            if (text.toLowerCase().includes(` ${kata} `) || text.toLowerCase() == kata) {
                await sock.sendMessage(msg?.key?.remoteJid, { text: "Jangan berkata kasar brow!" }, { quoted: msg });
                return;
            }
    }
}