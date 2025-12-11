import { promises as fs } from "fs";
import { resolve } from "path";

/**
 * Configuration file structure
 */
interface ConfigData {
    CommandOptions: {
        "COMMAND-PREFIXES": string[];
        "GROUP-ONLY": string[];
        "PRIVATE-ONLY": string[];
    };
    AntiLink: string[];
    [key: string]: any;
}

const CONFIG_PATH = resolve("./config.json");

/**
 * Read configuration from file
 */
const ReadConfig = async (): Promise<ConfigData> => {
    const config = await fs.readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(config);
};

/**
 * Check if anti-link is enabled for a JID
 */
const IsAntiLinkEnabled = async (remoteJid: string): Promise<boolean> => {
    const data = await ReadConfig();
    return data.AntiLink.includes(remoteJid);
};

/**
 * Modify configuration value
 */
const Modify = async (key: string, value: any): Promise<void> => {
    const data = await ReadConfig();
    data[key] = value;
    await fs.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2), "utf-8");
};

/**
 * Read user data (legacy compatibility)
 */
const ReadUserData = async (): Promise<Record<string, any>> => {
    // This is a placeholder - should use database instead
    return {};
};

export const Config = {
    ReadConfig,
    IsAntiLinkEnabled,
    Modify,
    ReadUserData,
};
