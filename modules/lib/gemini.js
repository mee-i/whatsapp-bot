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
const { Worker } = require("worker_threads");
const fs = require("fs");
const Config = require("../../config");

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
	let loadingFrame = 0;
	const worker = new Worker(
		`
        const { parentPort } = require('worker_threads');

        const frames = ['/', '—', '\\\\', '|'];
        let frameIndex = 0;

        function sendFrame() {
            parentPort.postMessage(frames[frameIndex]);
            frameIndex = (frameIndex + 1) % frames.length;
            setTimeout(sendFrame, 500);
        }

        sendFrame();
    `,
		{ eval: true }
	);

	worker.on("message", async (r) => {
		if (loadingFrame >= 20)
			worker
			.terminate()
			.then(() => {
				setTimeout(async () => {
					await sock.sendMessage(key?.remoteJid, { text: "Failed to generate AI message! send report to owner! /bug <message>", edit: msg.key });
				}, 500);
			})
			.catch((error) => {
				console.error("Error stopping worker:", error);
			});
		await sock.sendMessage(key?.remoteJid, { text: r, edit: msg.key });
		loadingFrame += 1;
	});

	// Handle errors
	worker.on("error", (e) => {
		console.error("Worker error:", e);
	});

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
	worker
		.terminate()
		.then(() => {
			// console.log("\nLoading complete");
		})
		.catch((error) => {
			console.error("Error stopping worker:", error);
		});

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

async function geminiNoWorker(sock, key, message) {
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
	geminiNoWorker,
	Config: {
		menu: "AI",
		disableMenu: [ "geminiNoWorker" ]
	},
};
