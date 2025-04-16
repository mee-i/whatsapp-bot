#!/bin/bash

set -e

if [ ! -f "database" ]; then 
    mkdir database
fi

. /etc/os-release

# Load environment variables from .env
if [ ! -f ".env" ]; then
    echo ".env file not found. Please create it with required variables."
    exit 1
fi

export $(grep -v '^#' .env | xargs)

# Check required env variables
REQUIRED_VARS=("MYSQL_USER" "MYSQL_HOST" "MYSQL_PORT")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Environment variable $var is not set in .env. Please set it."
        exit 1
    fi
done

if [ "$ID" = "ubuntu" ]; then
    echo "Ubuntu detected."
    
    # Download yt-dlp
    if ! wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O yt-dlp; then
        echo "Failed to download yt-dlp. Please install it manually."
        exit 1
    fi
    chmod +x yt-dlp

    # Install MySQL and create database/table
    {
        sudo apt update
        sudo apt install -y mysql-server
        sudo systemctl start mysql.service

        # Set up MySQL command
        MYSQL_CMD="mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER"
        if [ -n "$MYSQL_PASSWORD" ]; then
            MYSQL_CMD="$MYSQL_CMD -p$MYSQL_PASSWORD"
        fi

        # Create database
        $MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS bot;"

        # Create table
        $MYSQL_CMD -D bot -e "
        CREATE TABLE IF NOT EXISTS \`auth\` (
            \`session\` VARCHAR(50) NOT NULL,
            \`id\` VARCHAR(100) NOT NULL,
            \`value\` JSON DEFAULT NULL,
            UNIQUE KEY \`idxunique\` (\`session\`,\`id\`),
            KEY \`idxsession\` (\`session\`),
            KEY \`idxid\` (\`id\`)
        ) ENGINE=MyISAM;
        "
    } || {
        echo "MySQL setup failed. Please complete the installation manually."
        exit 1
    }

    echo "Setup completed successfully."

else
    echo "Other Linux distribution detected. We don't support it yet. :)"
    echo "Contribute to our repository if you want to add support for your distribution."
    exit 1
fi
