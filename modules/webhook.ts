import { defineCommand } from "@core/menu";
import { db } from "../database/index.js";
import { webhookTable } from "../database/schema.ts";
import { eq, and } from "drizzle-orm";
// crypto is available globally in Bun

export const webhook = defineCommand(
    {
        usage: "${prefix}webhook <create|delete|list|roll> [name]",
        menu: "Group",
        info: "Manage webhooks for the current group",
        groupOnly: true,
        adminGroup: true,
    },
    async ({ reply, sock, msg, args }) => {
        const jid = msg.key?.remoteJid!;
        const userId = msg.key?.participant || msg.key?.remoteJid!;
        const action = args[0]?.toLowerCase();
        const name = args[1];

        if (!action) {
            return reply(`Usage: /webhook <create|delete|list|roll> [name]`);
        }

        switch (action) {
            case "create": {
                if (!name) return reply("Please provide a name for the webhook!");
                
                // Check if name already exists in this group
                const [existing] = await db
                    .select()
                    .from(webhookTable)
                    .where(and(eq(webhookTable.group_id, jid), eq(webhookTable.name, name)))
                    .limit(1);

                if (existing) return reply(`A webhook named "${name}" already exists in this group.`);

                const id = crypto.randomUUID();
                const secretKey = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("hex");

                await db.insert(webhookTable).values({
                    id,
                    name,
                    owner_id: userId,
                    group_id: jid,
                    secret_key: secretKey,
                });

                const host = process.env.WEBHOOK_HOST || "http://localhost:3000";
                const url = `${host}/webhook/${id}`;

                await reply(`✅ Webhook "${name}" created!\nCheck your personal chat for the link and secret key.`);

                // Send to personal chat
                const personalJid = userId;
                const message = `*Miza Bot Webhook Details*
Name: ${name}
Group: ${jid}
URL: ${url}
Secret Key: ${secretKey}

*Usage:*
Include the secret key in the \`X-Webhook-Key\` header or as a \`key\` query parameter.
\`POST ${url}?key=${secretKey}\`
Body (JSON): \`{"message": "Hello world"}\``;

                await sock.sendMessage(personalJid, { text: message });
                break;
            }

            case "delete": {
                if (!name) return reply("Please provide the name of the webhook to delete.");

                const [target] = await db
                    .select()
                    .from(webhookTable)
                    .where(and(eq(webhookTable.group_id, jid), eq(webhookTable.name, name)))
                    .limit(1);

                if (!target) return reply(`Webhook "${name}" not found in this group.`);

                await db.delete(webhookTable).where(eq(webhookTable.id, target.id));
                await reply(`✅ Webhook "${name}" deleted.`);
                break;
            }

            case "list": {
                const webhooks = await db
                    .select()
                    .from(webhookTable)
                    .where(eq(webhookTable.group_id, jid));

                if (webhooks.length === 0) {
                    return reply("No webhooks registered for this group.");
                }

                const list = webhooks.map((w, i) => `${i + 1}. ${w.name} (Owner: ${w.owner_id.split("@")[0]})`).join("\n");
                await reply(`*Webhooks for this group:*\n\n${list}`);
                break;
            }

            case "roll": {
                if (!name) return reply("Please provide the name of the webhook to roll.");

                const [target] = await db
                    .select()
                    .from(webhookTable)
                    .where(and(eq(webhookTable.group_id, jid), eq(webhookTable.name, name)))
                    .limit(1);

                if (!target) return reply(`Webhook "${name}" not found in this group.`);

                const newKey = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("hex");
                await db.update(webhookTable).set({ secret_key: newKey }).where(eq(webhookTable.id, target.id));

                await reply(`✅ Webhook "${name}" secret key rolled!\nCheck your personal chat for the new key.`);
                
                const host = process.env.WEBHOOK_HOST || "http://localhost:3000";
                const url = `${host}/webhook/${target.id}`;
                
                await sock.sendMessage(userId, { 
                    text: `*Miza Bot Webhook Updated*\nName: ${name}\nNew URL: ${url}?key=${newKey}\nNew Key: ${newKey}` 
                });
                break;
            }

            default:
                reply("Unknown action. Use create, delete, list, or roll.");
        }
    }
);
