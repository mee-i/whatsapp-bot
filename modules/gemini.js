/*
 * Install the Generative AI SDK
 *
 * $ npm install @google/generative-ai
 */

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

function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) };

const safetySettings = [
	{
		category: HarmCategory.HARM_CATEGORY_HARASSMENT,
		threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
	},
];

async function gemini(sock, key, message) {
	const msg = await sock.sendMessage(key?.remoteJid, { text: "|" });
	// TODO: Fix this loading animation
	// let loadingFrame = 0;
	// const worker = new Worker("./utilities/loading-worker.js", {type: "module", });

	// worker.on("message", async (r) => {
	// 	if (loadingFrame >= 20)
	// 		worker
	// 		.terminate()
	// 		.then(() => {
	// 			setTimeout(async () => {
	// 				await sock.sendMessage(key?.remoteJid, { text: "Failed to generate AI message! send report to owner! /bug <message>", edit: msg.key });
	// 			}, 500);
	// 		})
	// 		.catch((error) => {
	// 			console.error("Error stopping worker:", error);
	// 		});
	// 	await sock.sendMessage(key?.remoteJid, { text: r, edit: msg.key });
	// 	loadingFrame += 1;
	// });

	// // Handle errors
	// worker.on("error", (e) => {
	// 	console.error("Worker error:", e);
	// });

	// await sleep(5000);

	const Database = fs.readFileSync("./database/ai-database.json");

	const AIDatabase = JSON.parse(Database);

	if (!AIDatabase["gemini"]) {
		AIDatabase["gemini"] = {
			model,
			userChat: {},
		};
	}
	if (!AIDatabase["gemini"]["userChat"][key?.remoteJid])
		AIDatabase["gemini"]["userChat"][key?.remoteJid] = [];

	const chatSession = model.startChat({
		generationConfig,
		safetySettings,
		history: AIDatabase["gemini"]["userChat"][key?.remoteJid],
	});

	//console.log(JSON.stringify(chatSession, null, 2));

	const result = await chatSession.sendMessage(message);
	//TODO: Fix this worker
	// worker
	// 	.terminate()
	// 	.then(() => {
	// 		// console.log("\nLoading complete");
	// 	})
	// 	.catch((error) => {
	// 		console.error("Error stopping worker:", error);
	// 	});

	fs.writeFileSync(
		"./database/ai-database.json",
		JSON.stringify(AIDatabase, null, 4),
		"utf8"
	);

	await sock.sendMessage(key?.remoteJid, {
		text: result.response.text(),
		edit: msg.key,
	});
}

async function geminiNoLoading(sock, key, message) {
	const Database = fs.readFileSync("./database/ai-database.json");

	const AIDatabase = JSON.parse(Database);

	if (!AIDatabase["gemini"]) {
		AIDatabase["gemini"] = {
			model,
			userChat: {},
		};
	}
	if (!AIDatabase["gemini"]["userChat"][key?.remoteJid])
		AIDatabase["gemini"]["userChat"][key?.remoteJid] = [];

	const chatSession = model.startChat({
		generationConfig,
		safetySettings,
		history: AIDatabase["gemini"]["userChat"][key?.remoteJid],
	});

	const result = await chatSession.sendMessage(message);

	fs.writeFileSync(
		"./database/ai-database.json",
		JSON.stringify(AIDatabase, null, 4),
		"utf8"
	);

	await sock.sendMessage(key?.remoteJid, {
		text: result.response.text()
	});
}

async function newchat(sock, key) {
	await sock.sendMessage(key?.remoteJid, { text: "Generating new chat..." });
	const Database = fs.readFileSync("./database/ai-database.json");

	const AIDatabase = JSON.parse(Database);

	if (!AIDatabase["gemini"]) {
		AIDatabase["gemini"] = {
			model,
			userChat: {},
		};
	}
	if (!AIDatabase["gemini"]["userChat"][key?.remoteJid])
		AIDatabase["gemini"]["userChat"][key?.remoteJid] = [];
	else AIDatabase["gemini"]["userChat"][key?.remoteJid] = [];

	fs.writeFileSync(
		"./database/ai-database.json",
		JSON.stringify(AIDatabase, null, 4),
		"utf8"
	);
	await sock.sendMessage(key?.remoteJid, { text: "Success!" });
}

module.exports = {
	newchat,
	gemini,
	geminiNoLoading,
	Config: {
		menu: "AI",
		disableMenu: [ "geminiNoWorker" ]
	},
};
