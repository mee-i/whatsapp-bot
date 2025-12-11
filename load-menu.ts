import { promises as fs } from "fs";
import { resolve, extname } from "path";
import type { WASocket, proto } from "baileys";

/**
 * Command context passed to handlers
 */
export interface CommandContext {
    sock: WASocket;
    msg: proto.IWebMessageInfo;
    isGroup: boolean;
}

/**
 * Command handler function type
 */
export type CommandHandler = (
    ctx: CommandContext,
    ...args: string[]
) => Promise<void>;

/**
 * Auto function handler type (for files starting with _)
 */
export type AutoFunctionHandler = (
    ctx: CommandContext & { text: string }
) => Promise<void>;

/**
 * Function details metadata
 */
export interface FunctionDetail {
    owneronly: boolean;
    admingroup: boolean;
    description: string;
    menu: string;
}

/**
 * Module configuration
 */
export interface ModuleConfig {
    menu?: string;
    disableMenu?: string[];
    details?: Record<string, Partial<FunctionDetail>>;
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
        let menuName = "";
        const moduleConfig = lib.Config;

        // Process module config
        if (moduleConfig && !fileName.startsWith("_")) {
            menuName = moduleConfig.menu ?? "";
            if (!MenuList[menuName]) {
                MenuList[menuName] = [];
            }
            if (moduleConfig.disableMenu) {
                disableMenu = moduleConfig.disableMenu;
            }

            // Process function details
            if (moduleConfig.details) {
                Object.keys(moduleConfig.details).forEach((fname) => {
                    if (!FunctionDetails[fname]) {
                        FunctionDetails[fname] = {
                            owneronly: false,
                            admingroup: false,
                            description: "",
                            menu: menuName,
                        };
                    }
                    const detail = moduleConfig.details![fname];
                    FunctionDetails[fname].owneronly =
                        detail.owneronly ?? false;
                    FunctionDetails[fname].admingroup =
                        detail.admingroup ?? false;
                    FunctionDetails[fname].description =
                        detail.description ?? "";
                    FunctionDetails[fname].menu = menuName;

                    if (!MenuList[menuName].includes(fname)) {
                        MenuList[menuName].push(fname);
                    }
                });
            }
        }

        // Ensure menu exists
        if (!MenuList[menuName]) {
            MenuList[menuName] = [];
        }

        // Run init function if exists
        if (typeof lib.init === "function") {
            lib.init();
        }

        // Register functions
        Object.keys(lib).forEach((key) => {
            // Skip Config and init
            if (key === "Config" || key === "init") return;

            if (!disableMenu.includes(key) && !fileName.startsWith("_")) {
                // Regular command
                FunctionCommand[key] = lib[key];
                if (!MenuList[menuName].includes(key)) {
                    MenuList[menuName].push(key);
                }
                if (!FunctionDetails[key]) {
                    FunctionDetails[key] = {
                        owneronly: false,
                        admingroup: false,
                        description: "",
                        menu: menuName,
                    };
                }
            } else if (fileName.startsWith("_")) {
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
