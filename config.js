const Config = {
  BotName: "MeeI Bot",
  Owner: "6281220533069",
  Admin: ["6281220533069"],
  AIMessage: [],
  CurrentNumber: "6281220533069",
  debug: true,

  ReadMessage: true,
  Sticker: {
    packname: "Sticker by MeeI Bot",
    author: "MeeI Bot",
  }
};

const FunctionCommand = {};
const AutoFunction = {};
const FunctionDetails = {};
const MenuList = {};

const EarthquakeAPI = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json";
const RealtimeEarthquakeAPI = "https://bmkg-content-inatews.storage.googleapis.com/live30event.xml";
//const EarthquakeAPI = "http://ancloud.my.id/gempa.json";

const Gemini = {
  model: "gemini-flash-latest",
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
  RealtimeEarthquakeAPI,
};
