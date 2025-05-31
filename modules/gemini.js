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
	maxOutputTokens: 32000,
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

async function gemini({ sock, msg }, message) {
	await sock.sendPresenceUpdate('composing', msg?.key?.remoteJid);
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
	const result = await chatSession.sendMessage(message);

	await sock.sendMessage(
		msg?.key?.remoteJid,
		{
			text: result.response.text(),
		},
		{ quoted: msg }
	);

	fs.writeFileSync(
		"./database/ai-database.json",
		JSON.stringify(AIDatabase, null, 4),
		"utf8"
	);
}




async function newchat({ sock, msg }) {
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
	gemini: async ({ sock, msg }, message) => gemini({ sock, msg }, message),
	ai: async ({ sock, msg }, message) => module.exports.gemini({ sock, msg }, message),
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
