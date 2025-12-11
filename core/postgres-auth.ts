import { eq, and } from "drizzle-orm";
import { initAuthCreds, BufferJSON, proto } from "baileys";
import type {
    AuthenticationCreds,
    AuthenticationState,
    SignalDataTypeMap,
} from "baileys";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";

/**
 * Custom PostgreSQL authentication state for Baileys
 * Lightweight implementation without external dependencies
 */
export async function usePostgreSQLAuthState(
    db: NodePgDatabase<any>,
    authTable: PgTableWithColumns<any>,
    sessionId: string = "baileys"
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
    // Write data to database
    const writeData = async (id: string, value: any): Promise<void> => {
        const data = JSON.stringify(value, BufferJSON.replacer);

        try {
            // Try to insert, if exists, update
            await db
                .insert(authTable)
                .values({
                    session: sessionId,
                    id: id,
                    value: data,
                })
                .onConflictDoUpdate({
                    target: [authTable.session, authTable.id],
                    set: { value: data },
                });
        } catch (error) {
            console.error(`Failed to write auth data for ${id}:`, error);
        }
    };

    // Read data from database
    const readData = async (id: string): Promise<any> => {
        try {
            const result = await db
                .select()
                .from(authTable)
                .where(
                    and(eq(authTable.session, sessionId), eq(authTable.id, id))
                )
                .limit(1);

            if (result.length > 0 && result[0].value) {
                return JSON.parse(result[0].value, BufferJSON.reviver);
            }
            return null;
        } catch (error) {
            console.error(`Failed to read auth data for ${id}:`, error);
            return null;
        }
    };

    // Remove data from database
    const removeData = async (id: string): Promise<void> => {
        try {
            await db
                .delete(authTable)
                .where(
                    and(eq(authTable.session, sessionId), eq(authTable.id, id))
                );
        } catch (error) {
            console.error(`Failed to remove auth data for ${id}:`, error);
        }
    };

    // Initialize credentials
    let creds: AuthenticationCreds = await readData("creds");
    if (!creds) {
        creds = initAuthCreds();
        await writeData("creds", creds);
    }

    return {
        state: {
            creds,
            keys: {
                get: async <T extends keyof SignalDataTypeMap>(
                    type: T,
                    ids: string[]
                ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
                    const data: { [id: string]: SignalDataTypeMap[T] } = {};
                    for (const id of ids) {
                        let value = await readData(`${type}-${id}`);
                        if (type === "app-state-sync-key" && value) {
                            value =
                                proto.Message.AppStateSyncKeyData.fromObject(
                                    value
                                );
                        }
                        data[id] = value;
                    }
                    return data;
                },
                set: async (data: any) => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                await writeData(key, value);
                            } else {
                                await removeData(key);
                            }
                        }
                    }
                },
            },
        },
        saveCreds: async () => {
            await writeData("creds", creds);
        },
    };
}
