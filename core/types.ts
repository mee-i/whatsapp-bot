import type { WASocket, proto, BaileysEventEmitter } from "baileys";

/**
 * Store structure for Baileys data
 */
export interface BaileysStore {
    chats: Map<string, any>;
    messages: Map<string, Map<string, proto.IWebMessageInfo>>;
    contacts: Record<string, any>;
    groupMetadata: Map<string, any>;
}

/**
 * Store file data structure
 */
export interface StoreFileData {
    chats: Array<[string, any]>;
    messages: Record<string, Array<[string, proto.IWebMessageInfo]>>;
    contacts: Record<string, any>;
    groupMetadata: Array<[string, any]>;
}

/**
 * Memory store instance interface
 */
export interface MemoryStore extends BaileysStore {
    bind: (sock: WASocket) => void;
    readFromFile: (file?: string) => Promise<void>;
    writeToFile: (file?: string) => Promise<void>;
    loadMessage: (
        jid: string,
        id: string
    ) => Promise<proto.IWebMessageInfo | undefined>;
    fetchGroupMetadata: (jid: string, sock: WASocket) => Promise<any>;
}
