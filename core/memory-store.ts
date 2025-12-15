import { promises as fs } from "fs";
import { resolve } from "path";
import type { WASocket, proto, BaileysEventEmitter } from "baileys";
import type { MemoryStore, StoreFileData } from "./types.js";

/**
 * Create a custom memory store for Baileys
 * Stores chats, messages, contacts, and group metadata
 */
function createMemoryStore(): MemoryStore {
    const chats = new Map<string, any>();
    const messages = new Map<string, Map<string, proto.IWebMessageInfo>>();
    const contacts: Record<string, any> = {};
    const groupMetadata = new Map<string, any>();

    /**
     * Bind event listeners to update store
     */
    const bind = (ev: BaileysEventEmitter): void => {
        ev.on("messages.upsert", ({ messages: newMessages }) => {
            for (const msg of newMessages) {
                const jid = msg.key.remoteJid;
                if (!jid) continue;

                if (!messages.has(jid)) {
                    messages.set(jid, new Map());
                }
                if (msg.key.id) {
                    messages.get(jid)!.set(msg.key.id, msg);
                }
            }
        });

        ev.on("messaging-history.set", ({ chats: newChats }) => {
            for (const chat of newChats) {
                chats.set(chat.id!, chat);
            }
        });

        ev.on("contacts.upsert", (newContacts) => {
            for (const contact of newContacts) {
                contacts[contact.id] = contact;
            }
        });

        ev.on("groups.update", (updates) => {
            for (const update of updates) {
                const current = groupMetadata.get(update.id!);
                groupMetadata.set(
                    update.id!,
                    current ? { ...current, ...update } : update
                );
            }
        });
    };

    /**
     * Read store data from file (async)
     */
    const readFromFile = async (
        file: string = resolve(__dirname, "../baileys_store.json")
    ): Promise<void> => {
        try {
            const exists = await fs
                .access(file)
                .then(() => true)
                .catch(() => false);
            if (!exists) return;

            const raw = await fs.readFile(file, "utf-8");
            const data: StoreFileData = JSON.parse(raw);

            // Restore chats
            if (data.chats) {
                for (const [jid, chat] of data.chats) {
                    chats.set(jid, chat);
                }
            }

            // Restore messages
            if (data.messages) {
                for (const [jid, msgs] of Object.entries(data.messages)) {
                    messages.set(jid, new Map(msgs));
                }
            }

            // Restore contacts
            if (data.contacts) {
                Object.assign(contacts, data.contacts);
            }

            // Restore group metadata
            if (data.groupMetadata) {
                for (const [jid, meta] of data.groupMetadata) {
                    groupMetadata.set(jid, meta);
                }
            }
        } catch (err) {
            console.error("Failed to read store:", (err as Error).message);
        }
    };

    /**
     * Write store data to file (async)
     */
    const writeToFile = async (
        file: string = resolve(__dirname, "../baileys_store.json")
    ): Promise<void> => {
        try {
            const data: StoreFileData = {
                chats: [...chats.entries()],
                messages: Object.fromEntries(
                    [...messages.entries()].map(([jid, msgs]) => [
                        jid,
                        [...msgs.entries()],
                    ])
                ),
                contacts,
                groupMetadata: [...groupMetadata.entries()],
            };

            await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
        } catch (err) {
            console.error("Failed to write store:", (err as Error).message);
        }
    };

    /**
     * Load a specific message from store
     */
    const loadMessage = async (
        jid: string,
        id: string
    ): Promise<proto.IWebMessageInfo | undefined> => {
        const msgs = messages.get(jid);
        return msgs?.get(id);
    };

    /**
     * Fetch group metadata with caching
     */
    const fetchGroupMetadata = async (
        jid: string,
        sock: WASocket
    ): Promise<any> => {
        try {
            // Return cached if available
            if (groupMetadata.has(jid)) {
                return groupMetadata.get(jid);
            }

            // Fetch and cache
            const metadata = await sock.groupMetadata(jid);
            groupMetadata.set(jid, metadata);
            return metadata;
        } catch (err) {
            console.error(
                "Failed to fetch group metadata:",
                (err as Error).message
            );
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

// Export singleton instance
export const store = createMemoryStore();
