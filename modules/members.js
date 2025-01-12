const store = require("../core/memory-store.js");

module.exports = {
  members: async (sock, msg) => {
    const groupdata = await store.fetchGroupMetadata(msg.key.remoteJid, sock);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `
*Group Title*: ${groupdata.subject}
*Members Count*: ${groupdata.participants.length}
*Members*:
${groupdata.participants
  .map((participant) => {
    const id = participant.id || "Unknown ID";
    const roles = participant.admin ?? "member";

    return `${id} ${roles}`;
  })
  .join("\n")}
      `,
    });
  },
};
