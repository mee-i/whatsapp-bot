const { sleep } = require("bun");

const { create: createYoutubeDl } = require("youtube-dl-exec");
const downloader = createYoutubeDl("C:\\YoutubeDownloader\\yt-dlp.exe");
const fs = require("fs");
const { v7: uuidv7 } = require('uuid');

function formatSecond(second) {
	const minute = Math.floor(second / 60);
	const esecond = second % 60;
	return `${minute} Minute ${esecond} Second`;
}

function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9_\-]/gi, '_'); // Ganti karakter ilegal dengan '_'
}


module.exports = {
	init: () => {
		const DirPath = "./media/downloads/";
		if (!fs.existsSync(DirPath)) fs.mkdirSync(DirPath, { recursive: true });
	},
	downloadmp3: async (sock, msg, link) => {
		await sock.sendMessage(msg.key.remoteJid, { text: `Downloading ${link}` });

		try {
			const uuid = uuidv7();

			const exec = await downloader.exec(link, {
				dumpSingleJson: true,
				simulate: false,
				extractAudio: true,
				audioFormat: "mp3",
				audioQuality: 0,
				output: `./media/downloads/${uuid}.%(ext)s`,
				noCheckCertificates: true,
				noWarnings: true,
				addHeader: ['user-agent:googlebot']
			});
			const download = JSON.parse(exec.stdout);

			const sanitizedName = sanitizeFilename(download.title.trim());
			const oldPath = `./media/downloads/${uuid}.mp3`;
			const newPath = `./media/downloads/${sanitizedName}.mp3`;
			fs.renameSync(oldPath, newPath);
            await sock.sendMessage(msg.key.remoteJid, {text: "Download Selesai. Mengirim video..."}, {quoted: msg});

			await sock.sendMessage(
				msg.key.remoteJid,
				{
                    document: { url: `./media/downloads/${sanitizedName}.mp3` },
                    mimetype: "audio/mp3",
                    fileName: `${sanitizedName}.mp3`,
                    caption: `*Audio successfully downloaded!*
Title: ${download.title}
Duration: ${formatSecond(download.duration)}` 
                },
				{
					quoted: msg,
				}
			);
			fs.unlinkSync(newPath);
		} catch (e) {
			await sock.sendMessage(msg.key.remoteJid, {
				text: "Caught an error! do you send link correctly?",
			});
			console.error(e);
		}
	},
    playaudio: async (sock, msg, link) => {
		await sock.sendMessage(msg.key.remoteJid, { text: `Downloading ${link}` });

		try {
			const uuid = uuidv7();

			const exec = await downloader.exec(link, {
				dumpSingleJson: true,
				simulate: false,
				extractAudio: true,
				audioFormat: "mp3",
				audioQuality: 0,
				output: `./media/downloads/${uuid}.%(ext)s`,
				noCheckCertificates: true,
				noWarnings: true,
				addHeader: ['user-agent:googlebot']
			});
			
			const download = JSON.parse(exec.stdout);
			await sock.sendMessage(msg.key.remoteJid, {text: "Download Selesai. Mengirim video..."}, {quoted: msg});

			const sanitizedName = sanitizeFilename(download.title.trim());
			const oldPath = `./media/downloads/${uuid}.mp3`;
			const newPath = `./media/downloads/${sanitizedName}.mp3`;
			fs.renameSync(oldPath, newPath);
			
			await sock.sendMessage(
				msg.key.remoteJid,
				{
                    audio: { url: newPath },
                    mimetype: "audio/mp4",
                },
				{
					quoted: msg,
				}
			);
			fs.unlinkSync(newPath);
		} catch (e) {
			await sock.sendMessage(msg.key.remoteJid, {
				text: "Caught an error! do you send link correctly?",
			});
			console.error(e);
		}
	},
    downloadmp4: async (sock, msg, link) => {
		await sock.sendMessage(msg.key.remoteJid, { text: `*Downloading* ${link}, ini akan mengambil waktu sedikit lama untuk video dengan durasi panjang` });

		try {
            const uuid = uuidv7();
			const exec = await downloader.exec(link, {
				dumpSingleJson: true,
				simulate: false,
				format: 'bestvideo+bestaudio/best',
                mergeOutputFormat: "mp4",
				output: `./media/downloads/${uuid}.%(ext)s`,
				noCheckCertificates: true,
				noWarnings: true,
				addHeader: ['user-agent:googlebot']
			});
            await sock.sendMessage(msg.key.remoteJid, {text: "Download Selesai. Mengirim video..."}, {quoted: msg});

			const download = JSON.parse(exec.stdout);

			const sanitizedName = sanitizeFilename(download.title.trim());
			const oldPath = `./media/downloads/${uuid}.mp4`;
			const newPath = `./media/downloads/${sanitizedName}.mp4`;
			fs.renameSync(oldPath, newPath);
			
			await sock.sendMessage(
				msg.key.remoteJid,
				{
                    document: { url: `./media/downloads/${sanitizedName}.mp4` },
                    mimetype: "audio/mp4",
                    fileName: `${sanitizedName}.mp4`,
                    caption: `*Video successfully downloaded!*
Title: ${download.title}
Duration: ${formatSecond(download.duration)}
Resolution: ${download.resolution || ""} ${download.fps + " fps " || " "}${download.dynamic_range || ""}`
                },
				{
					quoted: msg,
				}
			);
			fs.unlinkSync(newPath);
		} catch (e) {
			await sock.sendMessage(msg.key.remoteJid, {
				text: "Caught an error! do you send link correctly?",
			});
			console.error(e);
		}
	},
    Config: {
        menu: "Downloader",
        description: {
            downloadmp3: "Download mp3 dari web manapun (dokumen) (Resolusi tertinggi)",
            playaudio: "Download mp3 dari web manapun (audio) (Resolusi tertinggi)",
            downloadmp4: "Download mp4 dari web manapun (dokumen) (Resolusi tertinggi)",
        }
    }
};
