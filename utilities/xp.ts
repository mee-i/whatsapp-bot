import { db, userTable, eq } from "@db/index";
import type { WASocket, proto } from "baileys";

export const baseXP = 100;

export function getXPForLevel(level: number): number {
    return baseXP * Math.pow(level, 2);
}

export function getNextLevelXP(level: number): number {
    return getXPForLevel(level + 1);
}

export async function add({
    remoteJid,
    sock,
    msg,
}: {
    remoteJid: string;
    sock: WASocket;
    msg: proto.IWebMessageInfo;
}) {
    const [userdata] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, remoteJid));

    if (!userdata) return;

    userdata.xp = (userdata.xp || 0) + 25;
    const currentLevel = userdata.level || 0;

    const threshold = getNextLevelXP(currentLevel);

    if (userdata.xp >= threshold) {
        const initialLevel = currentLevel;
        const newLevel = currentLevel + 1;

        await sock.sendMessage(msg.key.remoteJid!, {
            text: `*LEVEL UP*
Hey @${userdata.name}, Level anda bertambah!
*${initialLevel}* > *${newLevel}*

XP Anda saat ini: ${userdata.xp}
XP untuk level berikutnya: ${getNextLevelXP(newLevel)}`,
            mentions: [remoteJid],
        });

        await db
            .update(userTable)
            .set({
                xp: userdata.xp,
                level: newLevel,
            })
            .where(eq(userTable.id, remoteJid));
    } else {
        await db
            .update(userTable)
            .set({
                xp: userdata.xp,
            })
            .where(eq(userTable.id, remoteJid));
    }
}
