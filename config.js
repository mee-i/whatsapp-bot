const Config = {
    Owner: "6281220533069",
    Admin: [],
    AIMessage: [],
    CurrentNumber: "6281220533069",

    ReadMessage: true
};

var FunctionCommand = {};

const EarthquakeAPI = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json";

const Gemini = {
    model: "gemini-1.5-flash",
    apiKey: "" // Add apiKey here
}
module.exports = {
    Config,
    FunctionCommand,
    Gemini,
    EarthquakeAPI
};
