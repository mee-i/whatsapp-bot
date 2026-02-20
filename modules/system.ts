import { defineCommand } from "@core/menu";
import { Config as ConfigFile } from "@utils/runtime-config";
import si from "systeminformation";
import os from "os";

// Helper function to format bytes
const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper function to format duration
const formatDuration = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

export const system = defineCommand(
    {
        usage: "${prefix}system",
        menu: "Info",
        info: "Display server system information",
        permission: ["owner"], // Restricted to owner for safety
    },
    async ({ send }) => {
        await send("Fetching system stats...");

        const [cpu, mem, osInfo, currentLoad] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.osInfo(),
            si.currentLoad(),
        ]);

        const uptime = os.uptime();

        const message = `*SYSTEM INFORMATION*

*CPU INFO*
• Manufacturer: ${cpu.manufacturer}
• Brand: ${cpu.brand}
• Speed: ${cpu.speed} GHz
• Cores: ${cpu.cores}
• Physical Cores: ${cpu.physicalCores}
• Current Load: ${currentLoad.currentLoad.toFixed(2)}%

*MEMORY INFO*
• Total: ${formatBytes(mem.total)}
• Free: ${formatBytes(mem.free)}
• Used: ${formatBytes(mem.used)}
• Active: ${formatBytes(mem.active)}
• Available: ${formatBytes(mem.available)}

*OS INFO*
• Platform: ${osInfo.platform}
• Distro: ${osInfo.distro}
• Release: ${osInfo.release}
• Arch: ${osInfo.arch}

*UPTIME*
• ${formatDuration(uptime)}
`;

        await send(message);
    }
);

export const setwpm = defineCommand(
    {
        usage: "${prefix}setwpm <number>",
        menu: "System",
        info: "Set writing speed (WPM)",
        permission: ["owner"],
    },
    async ({ args, send }) => {
        const wpm = parseInt(args[0]);
        if (isNaN(wpm) || wpm <= 0) {
            return await send("Please provide a valid WPM number (greater than 0)!");
        }

        await ConfigFile.ModifyTyping({ WritePerMinute: wpm });
        await send(`Typing speed has been set to *${wpm} WPM*!`);
    }
);

export const simulatetyping = defineCommand(
    {
        usage: "${prefix}simulatetyping",
        menu: "System",
        info: "Toggle simulate typing on/off",
        permission: ["owner"],
    },
    async ({ send }) => {
        const config = await ConfigFile.ReadConfig();
        const newState = !config.Typing.Simulate;
        
        await ConfigFile.ModifyTyping({ Simulate: newState });
        await send(`Simulate typing is now *${newState ? "ON" : "OFF"}*!`);
    }
);
