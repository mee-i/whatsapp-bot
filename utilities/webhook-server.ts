import { db } from "../database/index.js";
import { webhookTable } from "../database/schema.ts";
import { eq } from "drizzle-orm";
import type { WASocket } from "baileys";

export async function startWebhookServer(sock: WASocket) {
    const port = process.env.WEBHOOK_PORT || 3000;

    return Bun.serve({
        port: Number(port),
        async fetch(req) {
            const url = new URL(req.url);
            const pathParts = url.pathname.split("/");
            
            // Expected path: /webhook/:id
            if (pathParts[1] !== "webhook" || !pathParts[2]) {
                return new Response("Not Found", { status: 404 });
            }

            const webhookId = pathParts[2];
            const apiKey = req.headers.get("X-Webhook-Key") || url.searchParams.get("key");

            if (!apiKey) {
                return new Response("Unauthorized: Missing key", { status: 401 });
            }

            try {
                // Find webhook in DB
                const [webhook] = await db
                    .select()
                    .from(webhookTable)
                    .where(eq(webhookTable.id, webhookId))
                    .limit(1);

                if (!webhook) {
                    return new Response("Webhook not found", { status: 404 });
                }

                // Validate secret key
                if (webhook.secret_key !== apiKey) {
                    return new Response("Unauthorized: Invalid key", { status: 403 });
                }

                if (req.method !== "POST") {
                    return new Response("Method Not Allowed", { status: 405 });
                }

                const contentType = req.headers.get("content-type") || "";
                let groupMessage = "";

                if (contentType.includes("application/json")) {
                    const body = await req.json();
                    // Handle common JSON formats or Discord-like webhooks
                    groupMessage = body.content || body.message || JSON.stringify(body, null, 2);
                } else {
                    groupMessage = await req.text();
                }

                if (!groupMessage) {
                    return new Response("Bad Request: Empty message", { status: 400 });
                }

                // Send message to group
                await sock.sendMessage(webhook.group_id, { text: groupMessage });

                return new Response("OK", { status: 200 });
            } catch (error: any) {
                console.error("Webhook Error:", error);
                return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
            }
        },
    });
}
