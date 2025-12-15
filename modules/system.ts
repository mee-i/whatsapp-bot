import { defineCommand } from "@core/menu";
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
    async ({ sock, msg }) => {
        await sock.sendMessage(msg.key?.remoteJid!, {
            text: "Fetching system stats...",
        });

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

        await sock.sendMessage(msg.key?.remoteJid!, {
            text: message,
        });
    },
    {
        usage: "${prefix}system",
        menu: "Info",
        info: "Display server system information",
        permission: ["owner"], // Restricted to owner for safety
    }
);
