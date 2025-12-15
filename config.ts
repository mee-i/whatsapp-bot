export const Config = {
    BotName: "MeeI Bot",
    Owner: "6281220533069",
    Admin: ["6281220533069"],
    AIMessage: [] as string[],
    CurrentNumber: "6281220533069",
    debug: true,

    ReadMessage: true,
    Sticker: {
        packname: "Sticker by MeeI Bot",
        author: "MeeI Bot",
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
