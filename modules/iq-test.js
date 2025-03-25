let iq = [
    'IQ Anda Sebesar : 1',
    'IQ Anda Sebesar : 14',
    'IQ Anda Sebesar : 23',
    'IQ Anda Sebesar : 35',
    'IQ Anda Sebesar : 41',
    'IQ Anda Sebesar : 50',
    'IQ Anda Sebesar : 67',
    'IQ Anda Sebesar : 72',
    'IQ Anda Sebesar : 86',
    'IQ Anda Sebesar : 99',
    'IQ Anda Sebesar : 150',
    'IQ Anda Sebesar : 340',
    'IQ Anda Sebesar : 423',
    'IQ Anda Sebesar : 500',
    'IQ Anda Sebesar : 676',
    'IQ Anda Sebesar : 780',
    'IQ Anda Sebesar : 812',
    'IQ Anda Sebesar : 945',
    'IQ Anda Sebesar : 1000',
    'IQ Anda Sebesar : Tidak Terbatas!',
    'IQ Anda Sebesar : 5000',
    'IQ Anda Sebesar : 7500',
    'IQ Anda Sebesar : 10000',
]

module.exports = {
    iqtest: async ({sock, msg}) => {
        let hasiliq = 0;
        if ((Math.random() < 0.5 ? 0 : 1) == 1)
            hasiliq = Math.floor(Math.random() * 10000);
        else
            hasiliq = iq[Math.floor(Math.random() * iq.length)];
        await sock.sendMessage(msg.key.remoteJid, { text: `IQ Anda Sebesar: ${hasiliq}` });
    },
    Config: {
        menu: "Fun",
    }
}