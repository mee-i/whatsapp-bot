const Config = {
  BotName: "MeeI Bot",
  Owner: "6281220533069",
  Admin: [],
  AIMessage: [],
  CurrentNumber: "6281220533069",

  ReadMessage: true,
};

const FunctionCommand = {};
const AutoFunction = {};
const FunctionDetails = {};
const MenuList = {};

const EarthquakeAPI = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json";
//const EarthquakeAPI = "http://ancloud.my.id/gempa.json";

const Gemini = {
  model: "gemini-1.5-flash",
  apiKey: Bun.env.GEMINI_API_KEY,
};

module.exports = {
  Config,
  FunctionCommand,
  AutoFunction,
  FunctionDetails,
  MenuList,
  Gemini,
  EarthquakeAPI,
};
