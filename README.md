# WhatsApp Bot
A simple and customizable WhatsApp bot built using the [`@WhiskeySockets/Baileys`](https://github.com/WhiskeySockets/baileys) library. This bot allows you to automate responses, create commands, and interact with WhatsApp users programmatically.
---

## Features

- Send automated replies.
- Any website video/audio downloader https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md
- Command-based interaction (e.g., `/say Hello World!` responds with `Hello World!`)
- Ai Chat Bot (Gemini)
- Eathquake Notification (Using bmkg api)

---

## TODO
- [x] Make it easy to create command with function
- [x] Automatically generate menu list
- [x] Youtube, instagram, tiktok, any website, downloader
- [x] AI Chat bot
- [x] Earthquake Notification
- [x] Implement SQL Auth
- [x] Create a install script
- [x] Create a new setup script
- [x] Create auto download yt-dlp bin
- [ ] Create a sticker author
- [ ] Add more features up to 100++

## Installation

1. Install Bun, Git:

   ```bash
   sudo apt install git
   curl -fsSL https://bun.sh/install | bash # for macOS, Linux, and WSL
   ```
2. Clone Repository:
   ```bash
   git clone https://github.com/mee-i/whatsapp-bot
   ```
3. Open Whatsapp-Bot Folder:
   ```bash
   cd whatsapp-bot
   ```
4. Execute Linux Setup below

# Linux Setup (Download newest yt-dlp for downloader and setup MySQL Database & table)
## Current Distro support: Ubuntu
```bash
sudo bash linux_setup.sh
```

# Windows Setup
## Later :)
