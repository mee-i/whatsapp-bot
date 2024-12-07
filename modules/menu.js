const { FunctionCommand, FunctionDetails } = require("../config.js");
const fs = require("fs");

function getParameterNames(fn) {
    const functionString = fn.toString();
    const result = functionString.match(/\(([^)]*)\)/);
    return result ? result[1].split(',').map(param => param.trim()) : [];
}

module.exports = {
	menu: async (sock, msg) => {
        const datafile = fs.readFileSync("./cmd-config.json");
        const CommandOptions = JSON.parse(datafile);

		const now = new Date();
		const months = [
			"Januari",
			"Februari",
			"Maret",
			"April",
			"Mei",
			"Juni",
			"Juli",
			"Agustus",
			"September",
			"Oktober",
			"November",
			"Desember",
		];
		const formattedDate = `${now.getDate()} ${
			months[now.getMonth()]
		} ${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now
			.getMinutes()
			.toString()
			.padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
		let menu = `*MeeI Bot Menu!*
_Halo,_ *${msg?.pushName}*
${formattedDate}

Ketik /menu atau /help untuk menampilkan list menu!
List Menu:
`;
		Object.keys(FunctionCommand).sort().forEach((menuname) => {
			menu += "*[ " + menuname + " ]*\n";
			Object.keys(FunctionCommand[menuname]).sort().forEach((cmd) => {
				const Params = getParameterNames(FunctionCommand[menuname][cmd]);
				Params.shift();
				Params.shift();
				menu += " *" + CommandOptions["COMMAND-PREFIXES"][0] + cmd + "*";
				Params.forEach((element) => {
					menu += ` <${element}>`;
				});
                if (FunctionDetails[cmd])
                    menu += ` - _${FunctionDetails[cmd]}_`;
				menu += "\n";
			});
			menu += "\n";
		});
		//This is footer
		menu += "";
		await sock.sendMessage(
			msg?.key?.remoteJid,
			{
				image: { url: "./media/MeeI-Bot.png" },
				caption: menu,
			},
			{ quoted: msg }
		);
	},
    help: async (sock, msg) => { return module.exports.menu(sock, msg); }
};
