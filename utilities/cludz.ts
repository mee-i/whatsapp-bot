import * as CludzSDK from "@cludz/sdk";

export const cludz = new CludzSDK.Cludz({
    api: "https://api.cludz.net",
    key: process.env.CLUDZ_API_KEY,
});