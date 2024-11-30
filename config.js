const { processHistoryMessage } = require("@whiskeysockets/baileys");

const Config = {
    Owner: "6281220533069",
    Admin: [],
    AIMessage: [],
    CurrentNumber: "6281220533069",

    ReadMessage: true
};

const FunctionCommand = {};

const EarthquakeAPI = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json";
//const EarthquakeAPI = "http://ancloud.my.id/gempa.json";

const Gemini = {
    model: "gemini-1.5-flash",
    apiKey: Deno.env.get("GEMINI_API_KEY") // Add apiKey in .env
}

module.exports = {
    Config,
    FunctionCommand,
    Gemini,
    EarthquakeAPI
};
