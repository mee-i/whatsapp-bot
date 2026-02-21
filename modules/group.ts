import { defineCommand } from "@core/menu";

// Common metadata for group admin commands
const adminMeta = {
    groupOnly: true,
    adminGroup: true,
    requireBotAdmin: true,
};

export const leave = defineCommand(
    {
        usage: "${prefix}leave",
        menu: "Group",
        info: "Leave the group",
        permission: ["owner"],
        groupOnly: true,
    },
    async ({ reply, sock, msg }) => {
        const jid = msg.key?.remoteJid;
        if (!jid) return;
        await reply("Leaving the group...");
        await sock.groupLeave(jid);
    }
);

export const kick = defineCommand(
    {
        ...adminMeta,
        usage: "${prefix}kick @user",
        menu: "Group",
        info: "Kick a participant from the group",
    },
    async ({ reply, sock, msg, args }) => {
        const jid = msg.key?.remoteJid;
        const participant = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || args[0];
        if (!jid || !participant) return reply("Please mention a user or provide a JID!");
        
        const target = participant.includes("@") ? participant : `${participant}@lid`;
        await sock.groupParticipantsUpdate(jid, [target], "remove");
        await reply(`Successfully kicked ${target}`);
    }
);

export const promote = defineCommand(
    {
        ...adminMeta,
        usage: "${prefix}promote @user",
        menu: "Group",
        info: "Promote a participant to admin",
    },
    async ({ reply, sock, msg, args }) => {
        const jid = msg.key?.remoteJid;
        const participant = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || args[0];
        if (!jid || !participant) return reply("Please mention a user or provide a JID!");

        const target = participant.includes("@") ? participant : `${participant}@lid`;
        await sock.groupParticipantsUpdate(jid, [target], "promote");
        await reply(`Successfully promoted ${target}`);
    }
);

export const demote = defineCommand(
    {
        ...adminMeta,
        usage: "${prefix}demote @user",
        menu: "Group",
        info: "Demote an admin to participant",
    },
    async ({ reply, sock, msg, args }) => {
        const jid = msg.key?.remoteJid;
        const participant = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || args[0];
        if (!jid || !participant) return reply("Please mention a user or provide a JID!");

        const target = participant.includes("@") ? participant : `${participant}@lid`;
        await sock.groupParticipantsUpdate(jid, [target], "demote");
        await reply(`Successfully demoted ${target}`);
    }
);

export const setsubject = defineCommand(
    {
        ...adminMeta,
        usage: "${prefix}setsubject <new name>",
        menu: "Group",
        info: "Change the group name",
    },
    async ({ reply, sock, msg, args }) => {
        const jid = msg.key?.remoteJid;
        if (!jid || args.length === 0) return reply("Please provide a new group name!");
        
        await sock.groupUpdateSubject(jid, args.join(" "));
        await reply("Group name updated!");
    }
);

export const setdesc = defineCommand(
    {
        ...adminMeta,
        usage: "${prefix}setdesc <new description>",
        menu: "Group",
        info: "Change the group description",
    },
    async ({ reply, sock, msg, args }) => {
        const jid = msg.key?.remoteJid;
        if (!jid || args.length === 0) return reply("Please provide a new group description!");

        await sock.groupUpdateDescription(jid, args.join(" "));
        await reply("Group description updated!");
    }
);

export const setprofile = defineCommand(
    {
        ...adminMeta,
        usage: "${prefix}setprofile (reply to an image)",
        menu: "Group",
        info: "Change the group profile picture",
        requireImage: true,
    },
    async ({ reply, sock, msg, mediaPath }) => {
        const jid = msg.key?.remoteJid;
        if (!jid || !mediaPath) return;

        await sock.updateProfilePicture(jid, { url: mediaPath });
        await reply("Group profile picture updated!");
    }
);

export const link = defineCommand(
    {
        ...adminMeta,
        usage: "${prefix}link",
        menu: "Group",
        info: "Get the group invite link",
    },
    async ({ reply, sock, msg }) => {
        const jid = msg.key?.remoteJid;
        if (!jid) return;

        const code = await sock.groupInviteCode(jid);
        await reply(`https://chat.whatsapp.com/${code}`);
    }
);

export const revoke = defineCommand(
    {
        ...adminMeta,
        usage: "${prefix}revoke",
        menu: "Group",
        info: "Revoke the group invite link",
    },
    async ({ reply, sock, msg }) => {
        const jid = msg.key?.remoteJid;
        if (!jid) return;

        const code = await sock.groupRevokeInvite(jid);
        await reply(`Invite link revoked. New link: https://chat.whatsapp.com/${code}`);
    }
);

export const open = defineCommand(
    {
        ...adminMeta,
        usage: "${prefix}open",
        menu: "Group",
        info: "Open the group to everyone",
    },
    async ({ reply, sock, msg }) => {
        const jid = msg.key?.remoteJid;
        if (!jid) return;

        await sock.groupSettingUpdate(jid, "not_announcement");
        await reply("Group opened! Everyone can now send messages.");
    }
);

export const close = defineCommand(
    {
        ...adminMeta,
        usage: "${prefix}close",
        menu: "Group",
        info: "Close the group to admins only",
    },
    async ({ reply, sock, msg }) => {
        const jid = msg.key?.remoteJid;
        if (!jid) return;

        await sock.groupSettingUpdate(jid, "announcement");
        await reply("Group closed! Only admins can now send messages.");
    }
);


