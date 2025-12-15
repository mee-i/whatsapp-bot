import {
    defineCommand,
    MenuList,
    FunctionDetails,
    FunctionCommand,
} from "@core/menu";
import { db, userTable, eq } from "../database/index.ts";
import type { WAMessage } from "baileys";

export const menu = defineCommand(
    async ({ sock, msg, isGroup }) => {
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
            `Halo, ${pushName}\n` +
            `${date}\n` +
            `xp: ${xp}\n` +
            `level: ${level}\n\n`;

        // Loop through MenuList to get categories and commands
        const categories = Object.keys(MenuList).sort();

        for (const category of categories) {
            const commands = MenuList[category];
            if (!commands || commands.length === 0) continue;

            const validCommands = commands.filter(
                (cmd) => !cmd.startsWith("_")
            );
            if (validCommands.length === 0) continue;

            menuText += `[ ${category.toUpperCase()} ]\n`;

            for (const cmd of validCommands) {
                const details = FunctionDetails[cmd];
                const handler = FunctionCommand[cmd];

                // Default usage if custom usage is not provided
                // The default logic in system usually prepends prefix, but here we construct string manually
                // Assuming usage in metadata includes the prefix variable or is just the command
                let usage = details?.usage || `\${prefix}${cmd}`;

                // If usage contains ${prefix}, replace it with a generic '/' or handle it later
                // For now let's assume standard '/' prefix if not available to replace correctly or display as is
                // But wait, usage strings from metadata usually have ${prefix}.
                // Let's replace ${prefix} with '/' for display purposes
                usage = usage.replace("${prefix}", "/");

                const info = details?.description || "No description";

                let aliasStr = "";
                if (handler?.alias && handler.alias.length > 0) {
                    aliasStr = ` - alias: ${handler.alias
                        .map((a) => "/" + a)
                        .join(" ")}`;
                }

                menuText += `• ${usage} - ${info}${aliasStr}\n`;
            }
            menuText += "\n";
        }

        await sock.sendMessage(
            msg.key?.remoteJid!,
            {
                text: menuText.trim(),
            },
            {
                quoted: msg as WAMessage,
            }
        );
    },
    {
        usage: "${prefix}menu",
        menu: "General",
        info: "Display bot menu",
        alias: ["help", "start"],
    }
);
