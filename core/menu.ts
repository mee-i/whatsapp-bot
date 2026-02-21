import { promises as fs } from "fs";
import { resolve, extname } from "path";
import type { WASocket, proto } from "baileys";

/**
 * Media sending options
 */
export interface MediaOptions {
    media: string | Buffer;
    caption?: string;
    gif?: boolean;
    viewOnce?: boolean;
    asFile?: boolean;
    asDocument?: boolean; // Alias for asFile
}

/**
 * Command context passed to handlers
 */
export interface CommandContext {
    sock: WASocket;
    msg: proto.IWebMessageInfo;
    isGroup: boolean;
    args: string[];
    reply: (content: string | MediaOptions) => Promise<void>;
    send: (content: string | MediaOptions) => Promise<void>;
    mediaPath?: string;
}

/**
 * Permission types
 */
export type PermissionType =
    | "owner"
    | "admin"
    | "self_group_admin"
    | "user_group_admin"
    | "all";

/**
 * Command handler function type
 */
export interface CommandHandler {
    (ctx: CommandContext, ...args: string[]): Promise<void | string | MediaOptions>;
    usage?: string;
    category?: string;
    menu?: string;
    info?: string;
    permission?: PermissionType[];
    // Legacy support
    owneronly?: boolean;
    admingroup?: boolean;
    description?: string;
    alias?: string[];
    requireImage?: boolean;
    requireVideo?: boolean;
    groupOnly?: boolean;
    privateOnly?: boolean;
    adminGroup?: boolean;
    requireBotAdmin?: boolean;
}

/**
 * Auto function handler type (for files starting with _)
 */
export interface AutoFunctionHandler {
    (ctx: CommandContext & { text: string }): Promise<void>;
    groupOnly?: boolean;
    privateOnly?: boolean;
    adminGroup?: boolean;
    requireBotAdmin?: boolean;
}

/**
 * Function details metadata
 */
export interface FunctionDetail {
    permission: PermissionType[];
    description: string;
    menu: string;
    usage?: string;
    source?: string;
    isAlias?: boolean;
    requireImage?: boolean;
    requireVideo?: boolean;
    groupOnly?: boolean;
    privateOnly?: boolean;
    adminGroup?: boolean;
    requireBotAdmin?: boolean;
}

/**
 * Module configuration
 */
export interface ModuleConfig {
    menu?: string;
    disableMenu?: string[];
    details?: Record<
        string,
        Partial<FunctionDetail & { owneronly?: boolean; admingroup?: boolean }>
    >;
}

/**
 * Module export structure
 */
export interface ModuleExport {
    Config?: ModuleConfig;
    init?: () => void;
    [key: string]: any;
}

/**
 * Command metadata interface
 */
export interface CommandMetadata {
    usage?: string;
    category?: string;
    menu?: string;
    info?: string;
    permission?: PermissionType[];
    description?: string;
    owneronly?: boolean;
    admingroup?: boolean;
    alias?: string[];
    requireImage?: boolean;
    requireVideo?: boolean;
    groupOnly?: boolean;
    privateOnly?: boolean;
    adminGroup?: boolean;
    requireBotAdmin?: boolean;
}

/**
 * Auto function metadata interface
 */
export interface AutoFunctionMetadata {
    groupOnly?: boolean;
    privateOnly?: boolean;
    adminGroup?: boolean;
    requireBotAdmin?: boolean;
}

/**
 * Define a command with metadata
 */
export function defineCommand(
    metadata: CommandMetadata,
    handler: (ctx: CommandContext, ...args: string[]) => Promise<void>
): CommandHandler {
    const command = handler as CommandHandler;
    if (metadata) {
        Object.assign(command, metadata);
    }
    return command;
}

/**
 * Define an auto function
 */
export function defineAutoFunction(
    metadata: AutoFunctionMetadata,
    handler: AutoFunctionHandler
): AutoFunctionHandler {
    const fn = handler as any;
    if (metadata) {
        Object.assign(fn, metadata);
    }
    return fn;
}

/**
 * Global command registries
 */
export const FunctionCommand: Record<string, CommandHandler> = {};
export const FunctionDetails: Record<string, FunctionDetail> = {};
export const AutoFunction: Record<string, AutoFunctionHandler> = {};
export const MenuList: Record<string, string[]> = {};

/**
 * Clear all registries
 */
function clearRegistries(): void {
    Object.keys(FunctionCommand).forEach((key) => delete FunctionCommand[key]);
    Object.keys(FunctionDetails).forEach((key) => delete FunctionDetails[key]);
    Object.keys(AutoFunction).forEach((key) => delete AutoFunction[key]);
    Object.keys(MenuList).forEach((key) => delete MenuList[key]);
}

/**
 * Register a command and handle conflicts
 */
function registerCommand(
    key: string,
    command: CommandHandler,
    details: FunctionDetail,
    fileName: string,
    isAlias: boolean = false
) {
    if (FunctionCommand[key]) {
        const existingSource = FunctionDetails[key]?.source || "unknown";
        console.warn(
            `\x1b[31m[CONFLICT]\x1b[0m Command \x1b[33m/${key}\x1b[0m in \x1b[36m${fileName}\x1b[0m conflicts with \x1b[36m${existingSource}\x1b[0m`
        );
        return;
    }

    FunctionCommand[key] = command;
    FunctionDetails[key] = { ...details, source: fileName, isAlias };

    if (!isAlias) {
        if (!MenuList[details.menu]) MenuList[details.menu] = [];
        if (!MenuList[details.menu].includes(key)) {
            MenuList[details.menu].push(key);
        }
    }
}

/**
 * Load a single module file
 */
async function loadModule(filePath: string, fileName: string): Promise<void> {
    try {
        // Clear require cache for hot reload
        const fullPath = resolve(filePath);
        delete require.cache[require.resolve(fullPath)];

        console.log("Loading %s", filePath);

        // Import module
        const lib: ModuleExport = require(fullPath);
        let disableMenu: string[] = [];
        let defaultMenu = "";
        const moduleConfig = lib.Config;

        // Process module config
        if (moduleConfig && !fileName.startsWith("_")) {
            defaultMenu = moduleConfig.menu ?? "General";
            if (!MenuList[defaultMenu]) {
                MenuList[defaultMenu] = [];
            }
            if (moduleConfig.disableMenu) {
                disableMenu = moduleConfig.disableMenu;
            }
        }

        // Ensure menu exists
        if (defaultMenu && !MenuList[defaultMenu]) {
            MenuList[defaultMenu] = [];
        }

        // Run init function if exists
        if (typeof lib.init === "function") {
            lib.init();
        }

        // Register functions
        Object.keys(lib).forEach((key) => {
            // Skip Config and init
            if (key === "Config" || key === "init") return;

            if (!fileName.startsWith("_")) {
                if (disableMenu.includes(key)) return;

                // Regular command
                const command = lib[key] as CommandHandler;

                // Determine metadata
                const configDetail = moduleConfig?.details?.[key];

                // Permission logic
                let permissions: PermissionType[] = command.permission || [];

                // Legacy config support
                if (configDetail?.owneronly || command.owneronly)
                    permissions.push("owner");
                if (configDetail?.admingroup || command.admingroup || command.adminGroup)
                    permissions.push("admin");
                if (command.requireBotAdmin)
                    permissions.push("self_group_admin");
                if (command.adminGroup)
                    permissions.push("user_group_admin");

                // Deduplicate and default to 'all' if empty
                permissions = [...new Set(permissions)];
                if (permissions.length === 0) permissions.push("all");

                // Metadata resolution (Prop > Config > Default)
                const menu =
                    command.menu ||
                    command.category ||
                    configDetail?.menu ||
                    defaultMenu ||
                    "General";
                const description =
                    command.info ||
                    command.description ||
                    configDetail?.description ||
                    "";
                const usage = command.usage || configDetail?.usage;

                const details: FunctionDetail = {
                    permission: permissions,
                    description,
                    menu,
                    usage,
                    requireImage: command.requireImage,
                    requireVideo: command.requireVideo,
                    groupOnly: command.groupOnly,
                    privateOnly: command.privateOnly,
                    adminGroup: command.adminGroup,
                    requireBotAdmin: command.requireBotAdmin,
                };

                // Register main command
                registerCommand(key, command, details, fileName);

                // Register aliases
                if (command.alias && Array.isArray(command.alias)) {
                    command.alias.forEach((alias) => {
                        registerCommand(
                            alias,
                            command,
                            details,
                            fileName,
                            true
                        );
                    });
                }
            } else {
                // Auto function
                AutoFunction[key] = lib[key];
            }
        });
    } catch (error) {
        console.error(
            `Failed to load module ${fileName}:`,
            (error as Error).message
        );
    }
}

/**
 * Load all modules from modules directory
 */
export async function LoadMenu(): Promise<void> {
    clearRegistries();

    try {
        const modulesDir = "./modules/";
        const files = await fs.readdir(modulesDir);

        // Load all .js files
        const loadPromises = files
            .filter(
                (file) => extname(file) === ".js" || extname(file) === ".ts"
            )
            .map((file) => loadModule(modulesDir + file, file));

        await Promise.all(loadPromises);

        console.log(`Loaded ${Object.keys(FunctionCommand).length} commands`);
    } catch (error) {
        console.error("Error loading modules:", (error as Error).message);
    }
}
