
const { create: createYoutubeDl } = require("youtube-dl-exec");
const downloader = createYoutubeDl(process.env.YTDL_PATH || "yt-dlp");
const fs = require("fs");
const { v7: uuidv7 } = require("uuid");

// IMPORTANT: If you using VPS you maybe need to use cookies in yt-dlp
// READ: https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp
// SET YTDL_COOKIES in .env file (path to cookies.txt)
// example: YTDL_COOKIES=./cookies.txt
// cookies.txt should be netscape format
const cookies = process.env.YTDL_COOKIES || null; // Set cookies if needed

function isYouTubeLink(url) {
  const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return regex.test(url);
}

function formatSecond(second) {
  const minute = Math.floor(second / 60);
  const esecond = second % 60;
  return `${minute} Minute ${esecond} Second`;
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9_\-]/gi, "_"); // Ganti karakter ilegal dengan '_'
}

module.exports = {
  init: () => {
    const DirPath = "./media/downloads/";
    if (!fs.existsSync(DirPath)) fs.mkdirSync(DirPath, { recursive: true });
  },
  downloadmp3: async ({sock, msg}, link) => {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `*Downloading mp3*, ini akan mengambil waktu sedikit lama untuk video dengan durasi panjang`,
    }, {quoted: msg});

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
        // addHeader: ["referer:youtube.com", "user-agent:googlebot"],
        cookies: isYouTubeLink(link) ? cookies : null,
      });
      const download = JSON.parse(exec.stdout);

      const sanitizedName = sanitizeFilename(download.title.trim());
      const oldPath = `./media/downloads/${uuid}.mp3`;
      const newPath = `./media/downloads/${sanitizedName}.mp3`;
      fs.renameSync(oldPath, newPath);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "Download Selesai. Mengirim video..." },
        { quoted: msg }
      );

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          document: { url: `./media/downloads/${sanitizedName}.mp3` },
          mimetype: "audio/mp3",
          fileName: `${sanitizedName}.mp3`,
          caption: `*Audio successfully downloaded!*
Title: ${download.title}
Duration: ${formatSecond(download.duration)}`,
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
  playaudio: async ({sock, msg}, link) => {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `*Downloading mp3*, ini akan mengambil waktu sedikit lama untuk video dengan durasi panjang`,
    }, {quoted: msg});

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
        // addHeader: ["referer:youtube.com", "user-agent:googlebot"],
        cookies: isYouTubeLink(link) ? cookies : null,
      });

      const download = JSON.parse(exec.stdout);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "Download Selesai. Mengirim audio..." },
        { quoted: msg }
      );

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
  downloadmp4: async ({sock, msg}, link) => {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `*Downloading mp4*, ini akan mengambil waktu sedikit lama untuk video dengan durasi panjang`,
    }, {quoted: msg});

    try {
      const uuid = uuidv7();
      const exec = await downloader.exec(link, {
        dumpSingleJson: true,
        simulate: false,
				// format: "bestvideo[height<=720]+bestaudio/best",
        format: "bestvideo+bestaudio/best",
        mergeOutputFormat: "mp4",
        output: `./media/downloads/${uuid}.%(ext)s`,
        noCheckCertificates: true,
        noWarnings: true,
        // addHeader: ["referer:youtube.com", "user-agent:googlebot"],
        cookies: isYouTubeLink(link) ? cookies : null,
      });
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "Download Selesai. Mengirim video..." },
        { quoted: msg }
      );

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
Resolution: ${download.resolution || ""} ${download.fps + " fps " || " "}${
            download.dynamic_range || ""
          }`,
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
	ytmp4: async ({sock, msg}, link) => module.exports.downloadmp4({sock, msg}, link),
	ytmp3: async ({sock, msg}, link) => module.exports.downloadmp3({sock, msg}, link),
	instagram: async ({sock, msg}, link) => module.exports.downloadmp4({sock, msg}, link),
	ig: async ({sock, msg}, link) => module.exports.downloadmp4({sock, msg}, link),
	igaudio: async ({sock, msg}, link) => module.exports.playaudio({sock, msg}, link),
	tiktok: async ({sock, msg}, link) => module.exports.downloadmp4({sock, msg}, link),
	tt: async ({sock, msg}, link) => module.exports.downloadmp4({sock, msg}, link),
	ttaudio: async ({sock, msg}, link) => module.exports.playaudio({sock, msg}, link),
  Config: {
    menu: "Downloader",
    details: {
      downloadmp3: {
        description:
          "Download mp3 dari web manapun (dokumen) (Resolusi tertinggi)",
      },
      playaudio: {
        description:
          "Download mp3 dari web manapun (audio) (Resolusi tertinggi)",
      },
      downloadmp4: {
        description:
          "Download mp4 dari web manapun (dokumen) (Resolusi tertinggi)",
      },
			// instagram: {
      //   description:
      //     "Download mp4 dari Instagram (dokumen) (Resolusi tertinggi)",
      // },
			// ig: {
      //   description:
      //     "Download mp4 dari Instagram (dokumen) (Resolusi tertinggi)",
      // },
			// igaudio: {
      //   description:
      //     "Download mp3 dari Instagram (audio) (Resolusi tertinggi)",
      // },
			// tiktok: {
      //   description:
      //     "Download mp4 dari Tiktok (dokumen) (Resolusi tertinggi)",
      // },
			// tt: {
      //   description:
      //     "Download mp4 dari Tiktok (dokumen) (Resolusi tertinggi)",
      // },
			// ttaudio: {
      //   description:
      //     "Download mp3 dari Tiktok (audio) (Resolusi tertinggi)",
      // },
    },
  },
};
