export const Config = {
    BotName: "MeeI Bot",
    Owner: "26362542833890", // must use lid not number
    Admin: [""], // must use lid not number
    AIMessage: [] as string[],
    CurrentNumber: "", // must use lid not number
    debug: true,

    ReadMessage: true,
    Sticker: {
        packId: "miza-bot",
        packName: "Sticker by MeeI Bot",
        publisher: "MeeI Bot",
    },
};

export const EarthquakeAPI =
    "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json";
export const RealtimeEarthquakeAPI =
    "https://bmkg-content-inatews.storage.googleapis.com/live30event.xml";

export const Gemini = {
    model: "gemini-flash-latest",
    apiKey: process.env.GEMINI_API_KEY!,
};
