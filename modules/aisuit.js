
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
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

async function aisuit(sock, msg, opsi) {
  const message = await sock.sendMessage(msg?.key?.remoteJid, { text: "Oke" }, { quoted: msg});
  const chatSession = model.startChat({
    generationConfig,
    safetySettings,
    history: [],
  });

  const result = await chatSession.sendMessage(`Ayo kita bermain suit! Pilih antara rock, paper, atau scissor! Aku memilih ${opsi}`);
  await sock.sendMessage(msg?.key?.remoteJid, { text: result.response.text(), edit: message.key });
}

module.exports = {
  aisuit,
  Config: {
    menu: "Game"
  }
}