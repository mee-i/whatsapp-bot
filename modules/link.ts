import { defineAutoFunction } from "@core/menu";
import { checkGroupAdmin } from "@core/utils";

const URL_REGEX = /https?:\/\/[^\s]+/gi;

export const antilink = defineAutoFunction(
    { 
        groupOnly: true,
        requireBotAdmin: true
    },
    async (ctx) => {
        const { sock, msg, text, isGroup } = ctx;
        const jid = msg.key?.remoteJid;
        if (!isGroup || !text || !jid) return;

        if (URL_REGEX.test(text)) {
            // Check if sender is admin or owner
            const userIsAdmin = await checkGroupAdmin(msg, sock);
            if (userIsAdmin) return;

            // Delete message
            if (msg.key) {
                await sock.sendMessage(jid, { delete: msg.key });
            }
        }
    }
);
