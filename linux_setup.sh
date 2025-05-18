#!/bin/bash

# Regular Colors
BLACK='\e[30m'
RED='\e[31m'
GREEN='\e[32m'
YELLOW='\e[33m'
BLUE='\e[34m'
MAGENTA='\e[35m'
CYAN='\e[36m'
WHITE='\e[37m'
RESET='\e[0m'

# Bold
BOLD_BLACK='\e[1;30m'
BOLD_RED='\e[1;31m'
BOLD_GREEN='\e[1;32m'
BOLD_YELLOW='\e[1;33m'
BOLD_BLUE='\e[1;34m'
BOLD_MAGENTA='\e[1;35m'
BOLD_CYAN='\e[1;36m'
BOLD_WHITE='\e[1;37m'

# Underline
UNDERLINE_BLACK='\e[4;30m'
UNDERLINE_RED='\e[4;31m'
UNDERLINE_GREEN='\e[4;32m'
UNDERLINE_YELLOW='\e[4;33m'
UNDERLINE_BLUE='\e[4;34m'
UNDERLINE_MAGENTA='\e[4;35m'
UNDERLINE_CYAN='\e[4;36m'
UNDERLINE_WHITE='\e[4;37m'

# Backgrounds
BG_BLACK='\e[40m'
BG_RED='\e[41m'
BG_GREEN='\e[42m'
BG_YELLOW='\e[43m'
BG_BLUE='\e[44m'
BG_MAGENTA='\e[45m'
BG_CYAN='\e[46m'
BG_WHITE='\e[47m'

if [ -f /etc/os-release ]; then
    . /etc/os-release
else
    echo -e "[❌] ${RED}Cannot detect OS. /etc/os-release not found.${RESET}"
    exit 1
fi

if [ "$ID" = "ubuntu" ]; then
    echo -n "[ai] Do you have a Gemini API key? (for ai chat) (y/n): "
    read -r has_key
    if [[ "$has_key" =~ ^[Yy]$ ]]; then
        echo -n "[ai] Enter your Gemini API key: "
        read -r GEMINI_API_KEY
    else
        GEMINI_API_KEY=""
        echo -e "[ai] ${YELLOW}No Gemini API key set.${RESET}"
    fi
    echo -n "[mysql] Create user for MySQL: "
    read -r MYSQL_USER

    echo -n "[mysql] Password for $MYSQL_USER: "
    read -rs MYSQL_PASSWORD
    echo

    echo -n "[mysql] Database name: "
    read -r MYSQL_DATABASE

    echo "Select your JavaScript runtime:"
    echo "1) bun"
    echo "2) npm"
    echo -n "Enter choice [1-2]: "
    read -r js_choice

    case $js_choice in
    1) JS_RUNTIME="bun" JS_RUNTIME_X="bunx" ;;
    2) JS_RUNTIME="npm" JS_RUNTIME_X="npx" ;;
    *)
        echo -e "[⚠️] ${YELLOW}Invalid choice, defaulting to bun.${RESET}"
        JS_RUNTIME="bun" JS_RUNTIME_X="bunx"
        ;;
    esac

    if command -v "$JS_RUNTIME" >/dev/null 2>&1; then
        echo -e "[✅] ${GREEN}$JS_RUNTIME is installed${RESET}"
    else
        echo -e "[❌] ${RED}$JS_RUNTIME is not installed. Please install it manually.${RESET}"
        exit 1
    fi

    echo -e "[🔄️] ${MAGENTA}Installing mysql-server...${RESET}"
    if ! sudo apt install mysql-server -y; then
        echo -e "[❌] ${RED}Failed to install mysql-server. Please check your internet connection or package manager.${RESET}"
        exit 1
    else
        echo -e "[✅] ${GREEN}mysql-server installed${RESET}"
    fi

    # Create database and user with proper grants
    if ! sudo mysql -h localhost -u root -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DATABASE\`;"; then
        echo -e "[❌] ${RED}Failed to create database. Please check your MySQL server.${RESET}"
        exit 1
    fi

    if ! sudo mysql -h localhost -u root -e "CREATE USER IF NOT EXISTS '$MYSQL_USER'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';"; then
        echo -e "[❌] ${RED}Failed to create user. Please check your MySQL server.${RESET}"
        exit 1
    fi

    if ! sudo mysql -h localhost -u root -e "GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO '$MYSQL_USER'@'localhost';"; then
        echo -e "[❌] ${RED}Failed to grant privileges. Please check your MySQL server.${RESET}"
        exit 1
    fi

    if ! sudo mysql -h localhost -u root -e "FLUSH PRIVILEGES;"; then
        echo -e "[❌] ${RED}Failed to flush privileges. Please check your MySQL server.${RESET}"
        exit 1
    fi

    # Create table auth
    CREATE_TABLE_AUTH="CREATE TABLE IF NOT EXISTS auth (
    session varchar(50) NOT NULL,
    id varchar(100) NOT NULL,
    value json DEFAULT NULL,
    UNIQUE KEY idxunique (session, id),
    KEY idxsession (session),
    KEY idxid (id)
) ENGINE=MyISAM;"

    if ! sudo mysql -h localhost -u root -D "$MYSQL_DATABASE" -e "$CREATE_TABLE_AUTH"; then
        echo -e "[❌] ${RED}Failed to create table auth. Please check your MySQL server.${RESET}"
        exit 1
    fi
    echo -e "[✅] ${GREEN}Table auth created${RESET}"

    echo -e "[✅] ${GREEN}MySQL setup completed successfully${RESET}"

    echo -e "[🔄️] ${MAGENTA}Installing yt-dlp...${RESET}"
    if ! wget -q --show-progress https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp; then
        echo -e "[❌] ${RED}Failed to download yt-dlp. Please check your internet connection.${RESET}"
        exit 1
    fi
    if ! chmod +x yt-dlp; then
        echo -e "[❌] ${RED}Failed to make yt-dlp executable. Please check your permissions.${RESET}"
        exit 1
    fi

    if command -v ./yt-dlp >/dev/null 2>&1; then
        echo -e "[✅] ${GREEN}yt-dlp installed${RESET}"
    else
        echo -e "[❌] ${RED}yt-dlp is not installed. Please check your installation.${RESET}"
        exit 1
    fi

    echo -e "[🔄️] ${MAGENTA}Installing ffmpeg...${RESET}"
    if ! sudo apt install ffmpeg -y; then
        echo -e "[❌] ${RED}Failed to install ffmpeg. Please check your internet connection or package manager.${RESET}"
        exit 1
    fi

    if command -v ffmpeg >/dev/null 2>&1; then
        echo -e "[✅] ${GREEN}ffmpeg installed${RESET}"
    else
        echo -e "[❌] ${RED}ffmpeg is not installed. Please check your installation.${RESET}"
        exit 1
    fi

    if [ -f ".env" ]; then
        echo -e "[⚠️] ${YELLOW}.env file already exists.${RESET}"
        read -p "Do you want to overwrite the existing .env file? or (n) for using existing .env file (y/n): " choice
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            rm -f .env
            echo -e "[🔄️] ${MAGENTA}Old .env file removed. Proceeding to create a new one...${RESET}"
            cat >.env <<EOF
GEMINI_API_KEY=${GEMINI_API_KEY}

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=${MYSQL_USER}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
MYSQL_DATABASE=${MYSQL_DATABASE}

YTDL_PATH=./yt-dlp
EOF
            echo -e "[✅] ${GREEN}.env file created successfully${RESET}"
        else
            echo -e "[ℹ️] ${CYAN}Using existing .env file${RESET}"
        fi
    else
        cat >.env <<EOF
GEMINI_API_KEY=${GEMINI_API_KEY}

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=${MYSQL_USER}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
MYSQL_DATABASE=${MYSQL_DATABASE}

YTDL_PATH=./yt-dlp
EOF
        echo -e "[✅] ${GREEN}.env file created successfully${RESET}"
    fi

    echo -e "[🔄️] ${MAGENTA}Installing dependencies...${RESET}"
    if ! $JS_RUNTIME install; then
        echo -e "[❌] ${RED}Failed to install dependencies. Please check your package manager.${RESET}"
        exit 1
    fi

    if ! $JS_RUNTIME_X playwright install --with-deps; then
        echo -e "[❌] ${RED}Failed to install playwright dependencies. Please check the error message above.${RESET}"
        echo -e "[ℹ️] ${CYAN}You can install the dependencies manually using the command: $JS_RUNTIME_X playwright install${RESET}"
    fi

    echo -e "[✅] ${GREEN}Dependencies installed successfully${RESET}"

    echo -e "[🔄️] ${MAGENTA}Creating database directory...${RESET}"
    if ! mkdir database; then
        echo -e "[❌] ${RED}Failed to create database directory. Please check your permissions.${RESET}"
        exit 1
    fi
    echo -e "[✅] ${GREEN}Database directory created${RESET}"
    sleep 2
    echo -e "[✅] ${GREEN}Setup completed successfully${RESET}"
    echo -e "[ℹ️] ${CYAN}You can now run the bot using the command: $JS_RUNTIME run start${RESET}"

else
    echo -e "[❌] ${RED}This script is not supported on your OS.${RESET}"
    echo -e "[ℹ️] ${CYAN}You can help by creating a PR to add support for your OS.${RESET}"
    echo -e "[ℹ️] ${CYAN}Please check the documentation for installation instructions.${RESET}"
    exit 1
fi
