const store = require('../core/memory-store.js');

module.exports = {
  everyone: async ({sock, msg}, message) => {
    const groupdata = await store.fetchGroupMetadata(msg.key.remoteJid, sock);
    const mentions = [];
    for (const participant of groupdata.participants) {
        mentions.push(participant.id);
    }
    await sock.sendMessage(msg.key.remoteJid, { text: `@everyone ${message}`, mentions });
  },
  tageveryone: async ({sock, msg}, message) => {
    const groupdata = await store.fetchGroupMetadata(msg.key.remoteJid, sock);
    const mentions = [];
    for (const participant of groupdata.participants) {
        mentions.push(participant.id);
    }
    await sock.sendMessage(msg.key.remoteJid, { text: `${groupdata.participants.map((participant) => `@${participant.id.replace('@s.whatsapp.net', '')}`).join('\n')}

${message}
`, mentions});
  },
  hidetagall: async ({sock, msg}, message) => {
    const groupdata = await store.fetchGroupMetadata(msg.key.remoteJid, sock);
    const mentions = [];
    for (const participant of groupdata.participants) {
        mentions.push(participant.id);
    }
    await sock.sendMessage(msg.key.remoteJid, { text: `${message}`, mentions });
  },
  Config: {
    menu: "Group",
    details: {
      everyone: {
        admingroup: true,
      },
      tageveryone: {
        admingroup: true
      },
      hidetagall: {
        admingroup: true,
      },
    },
  }
}