const si = require('systeminformation')
const { Config } = require('../config');

function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 3600));
  seconds -= days * (24 * 3600);
  const hours = Math.floor(seconds / 3600);
  seconds -= hours * 3600;
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  return `${days} hari ${hours} jam ${minutes} menit ${Math.floor(seconds)} detik`;
}


module.exports = {
  system: async ({sock, msg}) => {
      await sock.sendMessage(msg.key.remoteJid, {text: "Tunggu sebentar, mengambil informasi..."}); 
      const cpu = await si.cpu();
      const baseboard = await si.baseboard();

      const memory = await si.mem();
      const battery = await si.battery();
      const graphic = await si.graphics();
      const os = await si.osInfo();
      const currentload = await si.currentLoad();
      const disk = await si.diskLayout();
      const diskio = await si.disksIO() ?? {};
      const time = await si.time();
      const Info = `${Config.BotName} Status
Server Uptime: ${formatUptime(time.uptime)}
Server Timezone: ${time.timezone}

*CPU Info*
Manufacturer: ${cpu.manufacturer}
Brand: ${cpu.brand}
Speed: ${cpu.speed} MHz
SpeedMin: ${cpu.speedMin}
SpeedMax: ${cpu.speedMax}
Cores: ${cpu.cores},
Virtualization: ${cpu.virtualization}

*Baseboard Info*
Manufacturer: ${baseboard.manufacturer}
Model: ${baseboard.model}
Memory Slots: ${baseboard.memSlots}

*Memory Info*
Total: ${(memory.total / (1024 ** 3)).toFixed(2)} GB
Free: ${(memory.free / (1024 ** 3)).toFixed(2)} GB
Used: ${(memory.used / (1024 ** 3)).toFixed(2)} GB
Active: ${(memory.active / (1024 ** 3)).toFixed(2)} GB
Available: ${(memory.available / (1024 ** 3)).toFixed(2)} GB
${battery.hasBattery ? `
*Battery Info*
Is Charging: ${battery.isCharging}
Percent: ${battery.percent}%
Current Capacity: ${battery.currentCapacity} mWh
Voltage: ${battery.voltage}
Ac Connected: ${battery.acConnected}
Time Remaining: ${battery.timeRemaining}
Designed Capacity: ${battery.designCapacity} mWh
`: ""}

*Graphic Card Info*
${graphic.controllers.map((data, i) => `
Graphic [${i++}]
Vendor: ${data.vendor}
Sub Vendor: ${data.subVendor}
Model: ${data.model}
VRAM: ${data.vram} MB
`).join('\n')}

*OS Info*
Platform: ${os.platform}
Distro: ${os.distro}
Architecture: ${os.arch}

*Current CPU Load*
Average Load: ${currentload.avgLoad}%
Current Load: ${currentload.currentLoad.toFixed(2)}%
${currentload.cpus.map((num, index) => `CPU [${index + 1}] ${num.load.toFixed(2)}%`).join('\n')}

*Disk*
Disk Read: ${diskio.rIO}
Disk Write: ${diskio.wIO}
Total Disk Write: ${diskio.tIO}
${disk.map((data, i) => `
Disk [${i++}]
Name: ${data.name}
Vendor: ${data.vendor}
Type: ${data.type}
Size: ${(data.size / (1024 ** 3)).toFixed(2)} GB`
).join('\n')}
`;
      await sock.sendMessage(msg.key.remoteJid, {text: Info}, {quoted: msg});
  },
  Config: {
    menu: "Info",
    details: {
      system: {
        description: "System Info"
      }
    }
  }
};