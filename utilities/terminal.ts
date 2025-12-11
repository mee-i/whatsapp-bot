import * as colors from "./colors.js";

/**
 * Log message in green
 */
export function Log(message: string): void {
    console.log(`${colors.FgGreen}%s${colors.Reset}`, message);
}

/**
 * Log error message in red
 */
export function ErrorLog(message: string): void {
    console.error(`${colors.FgRed}%s${colors.Reset}`, message);
}

/**
 * Log warning message in yellow
 */
export function WarnLog(message: string): void {
    console.warn(`${colors.FgYellow}%s${colors.Reset}`, message);
}

// Export as object for compatibility
export const terminal = {
    Log,
    ErrorLog,
    WarnLog,
};
