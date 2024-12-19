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

async function motivasi(sock, msg) {
  const message = await sock.sendMessage(msg?.key?.remoteJid, { text: "Sedang meracik motivasi..." }, { quoted: msg});
  const chatSession = model.startChat({
    generationConfig,
    safetySettings,
    history: [],
  });

  const result = await chatSession.sendMessage("Berikan saya 2 kalimat motivasi untuk hari ini");
  await sock.sendMessage(msg?.key?.remoteJid, { text: result.response.text(), edit: message.key });
}

async function katakata(sock, msg) {
  await sock.sendPresenceUpdate('composing', msg?.key?.remoteJid);
  const chatSession = model.startChat({
    generationConfig,
    safetySettings,
    history: [],
  });
  
  const result = await chatSession.sendMessage("Berikan saya 1 kalimat kata-kata untuk hari ini");
  await sock.sendMessage(msg?.key?.remoteJid, { text: result.response.text() }, { quoted: msg});
}

async function jokes(sock, msg) {
  await sock.sendPresenceUpdate('composing', msg?.key?.remoteJid);
  const chatSession = model.startChat({
    generationConfig,
    safetySettings,
    history: [],
  });
  
  const result = await chatSession.sendMessage("Berikan saya satu humor puns ngakak indonesia");
  await sock.sendMessage(msg?.key?.remoteJid, { text: result.response.text()}, {quoted: msg});
}

module.exports = {
  motivasi,
  katakata,
  jokes,
  Config: {
    menu: "Fun"
  }
}