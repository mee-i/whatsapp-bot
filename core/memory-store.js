const fs = require('fs');
const path = require('path');

function createCustomMemoryStore() {
  const chats = new Map();
  const messages = new Map(); // { jid: Map<id, msg> }
  const contacts = {};
  const groupMetadata = new Map();

  const bind = (ev) => {
    ev.on('messages.upsert', ({ messages: newMessages }) => {
      for (const msg of newMessages) {
        const jid = msg.key.remoteJid;
        if (!messages.has(jid)) messages.set(jid, new Map());
        messages.get(jid).set(msg.key.id, msg);
      }
    });

    ev.on('chats.set', ({ chats: newChats }) => {
      for (const chat of newChats) {
        chats.set(chat.id, chat);
      }
    });

    ev.on('contacts.upsert', (newContacts) => {
      for (const contact of newContacts) {
        contacts[contact.id] = contact;
      }
    });

    ev.on('groups.update', (updates) => {
      for (const update of updates) {
        if (groupMetadata.has(update.id)) {
          const current = groupMetadata.get(update.id);
          groupMetadata.set(update.id, { ...current, ...update });
        } else {
          groupMetadata.set(update.id, update);
        }
      }
    });
  };

  const readFromFile = (file = path.resolve(__dirname, '../baileys_store.json')) => {
    if (!fs.existsSync(file)) return;

    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
      for (const [jid, chat] of raw.chats || []) chats.set(jid, chat);
      for (const [jid, msgs] of Object.entries(raw.messages || {})) {
        messages.set(jid, new Map(msgs));
      }
      Object.assign(contacts, raw.contacts || {});
      for (const [jid, meta] of raw.groupMetadata || []) groupMetadata.set(jid, meta);
    } catch (err) {
      console.error('Failed to read store:', err.message);
    }
  };

  const writeToFile = (file = path.resolve(__dirname, '../baileys_store.json')) => {
    try {
      const data = {
        chats: [...chats.entries()],
        messages: Object.fromEntries(
          [...messages.entries()].map(([jid, msgs]) => [jid, [...msgs.entries()]])
        ),
        contacts,
        groupMetadata: [...groupMetadata.entries()]
      };
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to write store:', err.message);
    }
  };

  const loadMessage = async (jid, id) => {
    const msgs = messages.get(jid);
    if (!msgs) return undefined;
    return msgs.get(id);
  };

  const fetchGroupMetadata = async (jid, sock) => {
    try {
      const metadata = await sock.groupMetadata(jid);
      groupMetadata.set(jid, metadata);
      return metadata;
    } catch (err) {
      console.error('Failed to fetch group metadata:', err.message);
      return null;
    }
  };

  return {
    chats,
    messages,
    contacts,
    groupMetadata,
    bind,
    readFromFile,
    writeToFile,
    loadMessage,
    fetchGroupMetadata,
  };
}

module.exports = createCustomMemoryStore();