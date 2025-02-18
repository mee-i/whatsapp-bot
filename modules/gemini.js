const {
	GoogleGenerativeAI,
	HarmCategory,
	HarmBlockThreshold,
} = require("@google/generative-ai");
const { Worker } = require("node:worker_threads");
const fs = require("node:fs");
const Config = require("../config.js");

const apiKey = Config.Gemini.apiKey;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
	model: Config.Gemini.model,
});

const generationConfig = {
	temperature: 1,
	topP: 0.95,
	topK: 64,
	maxOutputTokens: 8192,
	responseMimeType: "text/plain",
};

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const safetySettings = [
	{
		category: HarmCategory.HARM_CATEGORY_HARASSMENT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
		threshold: HarmBlockThreshold.BLOCK_NONE
	},
	{
		category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
		threshold: HarmBlockThreshold.BLOCK_NONE
	},
	{
		category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
		threshold: HarmBlockThreshold.BLOCK_NONE
	}
];

async function gemini(sock, msg, message) {
	const sendmsg = await sock.sendMessage(msg?.key?.remoteJid, { text: "Tunggu bentar ya!" });
	let loadingFrame = 0;
	const worker = new Worker("./utilities/loading-worker.js");
	worker.on("message", async (r) => {
		if (loadingFrame >= 100)
			worker
				.terminate()
				.then(() => {
					setTimeout(async () => {
						await sock.sendMessage(msg?.key?.remoteJid, {
							text: "Failed to generate AI message! (?) (100s Frame Exceed) send report to owner! /bug <message>",
							edit: sendmsg.key,
						});
					}, 500);
				})
				.catch((error) => {
					console.error("Error stopping worker:", error);
				});
		await sock.sendMessage(msg?.key?.remoteJid, { text: r, edit: sendmsg.key });
		loadingFrame += 1;
	});

	worker.on("error", (e) => {
		console.error("Worker error:", e);
	});

	await sleep(5000);

	const Database = fs.readFileSync("./database/ai-database.json");

	const AIDatabase = JSON.parse(Database);

	if (!AIDatabase["gemini"]) {
		AIDatabase["gemini"] = {
			model,
			userChat: {},
		};
	}
	if (!AIDatabase["gemini"]["userChat"][msg?.key?.remoteJid])
		AIDatabase["gemini"]["userChat"][msg?.key?.remoteJid] = [];

	const chatSession = model.startChat({
		generationConfig,
		safetySettings,
		history: AIDatabase["gemini"]["userChat"][msg?.key?.remoteJid],
	});
	worker.terminate().catch((error) => {
		console.error("Error stopping worker:", error);
	});

	const result = await chatSession.sendMessage(message);

	fs.writeFileSync(
		"./database/ai-database.json",
		JSON.stringify(AIDatabase, null, 4),
		"utf8"
	);

	await sock.sendMessage(msg?.key?.remoteJid, {
		text: result.response.text(),
		edit: sendmsg.key,
	});
}


async function gemini_stream(sock, msg, message) {
	const sendmsg = await sock.sendMessage(msg?.key?.remoteJid, { text: "..." }, { quoted: msg });
	const Database = fs.readFileSync("./database/ai-database.json");

	const AIDatabase = JSON.parse(Database);

	if (!AIDatabase["gemini"]) {
		AIDatabase["gemini"] = {
			model,
			userChat: {},
		};
	}
	if (!AIDatabase["gemini"]["userChat"][msg?.key?.remoteJid])
		AIDatabase["gemini"]["userChat"][msg?.key?.remoteJid] = [];

	const chatSession = model.startChat({
		generationConfig,
		// safetySettings,
		history: AIDatabase["gemini"]["userChat"][msg?.key?.remoteJid],
	});
	const result = await chatSession.sendMessageStream(message);

	let resultText = "";
	for await (const chunk of result.stream) {
		resultText += chunk.text();
		await sock.sendMessage(msg?.key?.remoteJid, {
			text: resultText,
			edit: sendmsg.key,
		});
	}

	fs.writeFileSync(
		"./database/ai-database.json",
		JSON.stringify(AIDatabase, null, 4),
		"utf8"
	);
	await sock.sendMessage(msg?.key?.remoteJid, {
		text: resultText,
		edit: sendmsg.key,
	});
}




async function newchat(sock, msg) {
	await sock.sendMessage(msg?.key?.remoteJid, { text: "Generating new chat..." });
	const Database = fs.readFileSync("./database/ai-database.json");

	const AIDatabase = JSON.parse(Database);

	if (!AIDatabase["gemini"]) {
		AIDatabase["gemini"] = {
			model,
			userChat: {},
		};
	}
	if (!AIDatabase["gemini"]["userChat"][msg?.key?.remoteJid])
		AIDatabase["gemini"]["userChat"][msg?.key?.remoteJid] = [];
	else AIDatabase["gemini"]["userChat"][msg?.key?.remoteJid] = [];

	fs.writeFileSync(
		"./database/ai-database.json",
		JSON.stringify(AIDatabase, null, 4),
		"utf8"
	);
	await sock.sendMessage(msg?.key?.remoteJid, { text: "Success!" });
}

module.exports = {
	init: () => {
		const DbFile = "./database/ai-database.json";
		if (!fs.existsSync(DbFile))
			fs.writeFileSync(DbFile, JSON.stringify({}), "utf-8");
	},
	newchat,
	gemini: async (a, b, message) => gemini_stream(a, b, message),
	ai: async (a, b, message) => module.exports.gemini(a, b, message),
	Config: {
		menu: "AI",
		details: {
			gemini: {
				description: `AI Gemini (${Config.Gemini.model})`
			},
			ai: {
				description: `AI Gemini (${Config.Gemini.model})`
			}
		}
	},
};
