const { create: createYoutubeDl } = require("youtube-dl-exec");
const youtubedl = createYoutubeDl("C:\\YoutubeDownloader\\yt-dlp.exe");
const fs = require("fs");

function formatSecond(second) {
	const minute = Math.floor(second / 60);
	const esecond = second % 60;
	return `${minute} Minute ${esecond} Second`;
}

module.exports = {
	init: () => {
		const DirPath = "./media/downloads/";
		if (!fs.existsSync(DirPath)) fs.mkdirSync(DirPath, { recursive: true });
	},
	ytmp3: async (sock, msg, link) => {
		await sock.sendMessage(msg.key.remoteJid, { text: `Downloading ${link}` });

		try {
			const exec = await youtubedl.exec(link, {
				dumpSingleJson: true,
				simulate: false,
				extractAudio: true,
				audioFormat: "mp3",
				audioQuality: 0,
				output: "./media/downloads/%(title)s.%(ext)s",
			});

			const download = JSON.parse(exec.stdout);
			await sock.sendMessage(
				msg.key.remoteJid,
				{
                    document: { url: `./media/downloads/${download.title}.mp3` },
                    mimetype: "audio/mp3",
                    fileName: `${download.title}.mp3`,
                    caption: `*Audio successfully downloaded!*
Title: ${download.title}
Duration: ${formatSecond(download.duration)}` 
                },
				{
					quoted: msg,
				}
			);
		} catch (e) {
			await sock.sendMessage(msg.key.remoteJid, {
				text: "Caugh't an error! do you send link correctly?",
			});
			console.error(e);
		}
	},
    ytaudio: async (sock, msg, link) => {
		await sock.sendMessage(msg.key.remoteJid, { text: `Downloading ${link}` });

		try {
			const exec = await youtubedl.exec(link, {
				dumpSingleJson: true,
				simulate: false,
				extractAudio: true,
				audioFormat: "mp3",
				audioQuality: 0,
				output: "./media/downloads/%(title)s.%(ext)s",
			});

			const download = JSON.parse(exec.stdout);
			await sock.sendMessage(
				msg.key.remoteJid,
				{
                    audio: { url: `./media/downloads/${download.title}.mp3` },
                    mimetype: "audio/mp3",
                },
				{
					quoted: msg,
				}
			);
		} catch (e) {
			await sock.sendMessage(msg.key.remoteJid, {
				text: "Caugh't an error! do you send link correctly?",
			});
			console.error(e);
		}
	},
    ytmp4: async (sock, msg, link) => {
		await sock.sendMessage(msg.key.remoteJid, { text: `Downloading ${link}, ini akan mengambil waktu lumayan lama untuk video dengan durasi lama` });

		try {
			const exec = await youtubedl.exec(link, {
				dumpSingleJson: true,
				simulate: false,
				format: 'bestvideo+bestaudio/best',
                mergeOutputFormat: "mp4",
				output: "./media/downloads/%(title)s.%(ext)s",
			});
            await sock.sendMessage(msg.key.remoteJid, {text: "Download Selesai. Mengirim video..."}, {quoted: msg});

			const download = JSON.parse(exec.stdout);
			await sock.sendMessage(
				msg.key.remoteJid,
				{
                    document: { url: `./media/downloads/${download.title}.mp4` },
                    mimetype: "audio/mp4",
                    fileName: `${download.title}.mp4`,
                    caption: `*Video successfully downloaded!*
Title: ${download.title}
Duration: ${formatSecond(download.duration)}
Resolution: ${download.resolution} ${download.fps} fps ${download.dynamic_range}`
                },
				{
					quoted: msg,
				}
			);
		} catch (e) {
			await sock.sendMessage(msg.key.remoteJid, {
				text: "Caugh't an error! do you send link correctly?",
			});
			console.error(e);
		}
	},
    Config: {
        menu: "Downloader",
        description: {
            ytmp3: "Download mp3 (dokumen) (Resolusi tertinggi)",
            ytaudio: "Download mp3 (audio) (Resolusi tertinggi)",
            ytmp4: "Download mp4 (dokumen) (Resolusi tertinggi)",
        }
    }
};
