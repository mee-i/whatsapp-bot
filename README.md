<p align="center">
  <img src="https://github.com/user-attachments/assets/9f06743d-cb9a-4952-a239-63b04a32eb6a" alt="Meei Whatsapp Bot GIF" />
</p>

# MeeI WhatsApp Bot

## A powerful and highly customizable WhatsApp bot built using Bun and the [`baileys`](https://github.com/WhiskeySockets/baileys) library.

## Features

-   **Sticker & Media**: Convert images and videos to stickers with custom metadata (Pack name & Author).
-   **Meme Generation**: Create hilarious memes and meme stickers on the fly with `.meme` and `.smeme`.
-   **Multi-Platform Downloader**: Support for YouTube, Instagram, TikTok, and more via `yt-dlp`.
-   **AI Chat (Gemini)**: Integration with Google's Gemini Pro for smart interactions.
-   **Real-time Earthquake Notifications**: Stay informed with live updates from BMKG.
-   **PostgreSQL Support**: Reliable session management and data storage.
-   **Command System**: Easily extendable command architecture with permission guards.

---

## Getting Started

### Prerequisites

-   [Bun](https://bun.sh/) installed.
-   [FFmpeg](https://ffmpeg.org/) installed for sticker and media processing.
-   PostgreSQL database.

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  Configure your credentials:
    Create a `.env` file and set your `DATABASE_URL` and `GEMINI_API_KEY`.
    Update `config.ts` with your owner LID.

4.  Start the bot:
    ```bash
    bun run start
    ```

### Basic Commands

-   `/s` or `/sticker`: Reply to an image/video to make a sticker.
-   `/smeme`: Create a meme sticker.
-   `/meme`: Create an image meme.
-   `/ai`: Chat with Gemini.
-   `/enablebot`: Enable the bot in a chat.

---

## Deployment

Deploy using PM2 to keep it running 24/7:
```bash
bun run deploy
```

---

## TODO

-   [x] Implement PostgreSQL Auth
-   [x] High-quality Sticker creation (Image/Video)
-   [x] AI Chat bot integration
-   [x] Earthquake Notification
-   [x] Meme & Sticker-Meme generation
-   [x] Group commands (Kick, Warn, Lockdown)
-   [x] Automated Menu generation
-   [ ] Multi-language translation support
-   [ ] CI/CD Pipeline

---

## License

This project is licensed under the MIT License.
