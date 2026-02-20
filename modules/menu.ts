import {
    defineCommand,
    MenuList,
    FunctionDetails,
    FunctionCommand,
} from "@core/menu";
import { db, userTable, eq } from "../database/index.ts";

export const menu = defineCommand(
    {
        usage: "${prefix}menu",
        menu: "General",
        info: "Display bot menu",
        alias: ["help", "start"],
    },
    async ({ reply, isGroup, msg }) => {
        const sender = isGroup ? msg.key?.participant! : msg.key?.remoteJid!;
        const pushName = msg.pushName || "User";

        // Fetch user data
        const [userData] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, sender));

        const xp = userData?.xp || 0;
        const level = userData?.level || 0;

        // Date formatting
        const date = new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Jakarta",
        });

        // Build menu text
        let menuText =
            `*Welcome to Mee-i Bot Menu!*\n\n` +
            `Hello, _*${pushName}*_ 👋\n` +
            `${date}\n` +
            `XP: *${xp}*\n` +
            `Level: *${level}*\n` +
            `Total Feature: ${Object.values(MenuList).reduce((acc, commands) => {
                return acc + commands.length;
            }, 0)}\n\n`;

        // Loop through MenuList to get categories and commands
        const categories = Object.keys(MenuList).sort();

        for (const category of categories) {
            const commands = MenuList[category];
            if (!commands || commands.length === 0) continue;

            const validCommands = commands.filter(
                (cmd) => !cmd.startsWith("_"),
            );
            if (validCommands.length === 0) continue;

            menuText += `[ *${category.toUpperCase()}* ]\n`;

            for (const cmd of validCommands) {
                const details = FunctionDetails[cmd];
                const handler = FunctionCommand[cmd];

                let usage = details?.usage || `\${prefix}${cmd}`;
                usage = usage.replace("${prefix}", "/");

                const info = details?.description || "No description";
                const isRestricted = details?.permission?.some((p) =>
                    ["owner", "admin"].includes(p),
                );
                const emoji = isRestricted ? "🔒" : "";

                let aliasStr = "";
                if (handler?.alias && handler.alias.length > 0) {
                    aliasStr = ` - alias: ${handler.alias
                        .map((a) => "/" + a)
                        .join(" ")}`;
                }

                menuText += `• *${usage}* - ${info}${aliasStr} ${emoji}\n`;
            }
            menuText += "\n";
        }

        await reply(menuText.trim());
    },
);
