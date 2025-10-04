const { db, userTable, itemsTable, userBankTable, userInventoryTable, eq } = require("../database");

function getRandomFish(fishes) {
    const random = Math.random(); // 0 - 1
    let cumulative = 0;

    for (const fish of fishes) {
        cumulative += fish.chance;
        if (random < cumulative) {
            return fish;
        }
    }
    return null; // kalau tidak kena chance (misalnya gagal mancing)
}

// Utility functions
function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

async function getUserData(userId) {
    let userData = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .then((res) => res[0]);

    if (!userData) {
        // Auto register new user
        await db.insert(userTable).values({
            id: userId,
            name: "Unknown User",
        });

        userData = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, userId))
            .then((res) => res[0]);
    }

    return userData;
}

// DAILY COMMAND (already exists, keeping for reference)
async function daily({ sock, msg }) {
    try {
        const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;
        const userData = await getUserData(remoteJid);
        const currentTime = new Date();

        if (!userData.daily_time) {
            const randomMoney = getRandomInt(50, 500);

            await db
                .update(userTable)
                .set({
                    daily_time: currentTime,
                    money: userData.money + randomMoney,
                })
                .where(eq(userTable.id, remoteJid));

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `💰 Daily money collected! You received $${formatNumber(
                        randomMoney
                    )}`,
                },
                { quoted: msg }
            );
            return;
        }

        const lastDailyTime = new Date(userData.daily_time);
        const timeDifference = currentTime - lastDailyTime;
        const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));

        if (hoursDifference < 24) {
            const hoursLeft = 23 - hoursDifference;
            const minutesLeft =
                59 -
                Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
            const secondsLeft =
                59 - Math.floor((timeDifference % (1000 * 60)) / 1000);

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `⏰ Sorry, please wait again for ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`,
                },
                { quoted: msg }
            );
        } else {
            const randomMoney = getRandomInt(50, 500);

            await db
                .update(userTable)
                .set({
                    daily_time: currentTime,
                    money: userData.money + randomMoney,
                })
                .where(eq(userTable.id, remoteJid));

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `💰 Daily money collected! You received $${formatNumber(
                        randomMoney
                    )}`,
                },
                { quoted: msg }
            );
        }
    } catch (error) {
        console.error("Daily command error:", error);
        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text: "❌ An error occurred while processing your daily reward.",
            },
            { quoted: msg }
        );
    }
}

// BALANCE COMMAND
async function balance({ sock, msg }) {
    try {
        const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;
        const userData = await getUserData(remoteJid);

        const bankData = await db
            .select()
            .from(userBankTable)
            .where(eq(userBankTable.user_id, remoteJid))
            .then((res) => res[0]);

        const bankBalance = bankData ? bankData.balance : 0;

        const balanceText =
            `💰 *Your Balance*\n\n` +
            `💵 Cash: $${formatNumber(userData.money)}\n` +
            `🏦 Bank: $${formatNumber(bankBalance)}\n` +
            `💎 Total: $${formatNumber(userData.money + bankBalance)}\n\n` +
            `⭐ Level: ${userData.level}\n` +
            `✨ XP: ${formatNumber(userData.xp)}`;

        await sock.sendMessage(
            msg.key.remoteJid,
            { text: balanceText },
            { quoted: msg }
        );
    } catch (error) {
        console.error("Balance command error:", error);
        await sock.sendMessage(
            msg.key.remoteJid,
            { text: "❌ An error occurred while checking your balance." },
            { quoted: msg }
        );
    }
}

// WORK COMMAND
async function work({ sock, msg }) {
    try {
        const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;
        const userData = await getUserData(remoteJid);
        const currentTime = new Date();

        // Check cooldown
        if (userData.last_work) {
            const lastWork = new Date(userData.last_work);
            const timeDiff = currentTime - lastWork;
            const minutesDiff = Math.floor(timeDiff / (1000 * 60));

            if (minutesDiff < 60) {
                // 1 hour cooldown
                const minutesLeft = 60 - minutesDiff;
                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        text: `⏰ You're tired! Please wait ${minutesLeft} minutes before working again.`,
                    },
                    { quoted: msg }
                );
                return;
            }
        }

        const jobs = [
            { name: "Delivery Driver", min: 200, max: 500 },
            { name: "Freelancer", min: 300, max: 700 },
            { name: "Waiter", min: 150, max: 400 },
            { name: "Security Guard", min: 250, max: 600 },
            { name: "Cleaner", min: 100, max: 350 },
        ];

        const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
        const earnings = getRandomInt(randomJob.min, randomJob.max);
        const xpGain = Math.floor(earnings / 10);

        await db
            .update(userTable)
            .set({
                last_work: currentTime,
                money: userData.money + earnings,
                xp: userData.xp + xpGain,
            })
            .where(eq(userTable.id, remoteJid));

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    `💼 You worked as a ${randomJob.name}!\n\n` +
                    `💰 Earned: $${formatNumber(earnings)}\n` +
                    `✨ XP gained: ${xpGain}`,
            },
            { quoted: msg }
        );
    } catch (error) {
        console.error("Work command error:", error);
        await sock.sendMessage(
            msg.key.remoteJid,
            { text: "❌ An error occurred while working." },
            { quoted: msg }
        );
    }
}

// FISHING COMMAND
async function fishing({ sock, msg }) {
    try {
        const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;
        const userData = await getUserData(remoteJid);
        const currentTime = new Date();

        // Check cooldown
        if (userData.last_fishing) {
            const lastFishing = new Date(userData.last_fishing);
            const timeDiff = currentTime - lastFishing;
            const minutesDiff = Math.floor(timeDiff / (1000 * 60));

            if (minutesDiff < 5) {
                const minutesLeft = 5 - minutesDiff;
                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        text: `🎣 The fish are resting! Please wait ${minutesLeft} minutes before fishing again.`,
                    },
                    { quoted: msg }
                );
                return;
            }
        }

        const fishes = await db
            .select()
            .from(itemsTable)
            .where(eq(itemsTable.category, "fish"));

        if (fishes.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, { text: "No fish in the water, sorry!" }, { quoted: msg });
            return;
        }

        const caughtFish = getRandomFish(fishes);

        if (!caughtFish) {
            await db
                .update(userTable)
                .set({ last_fishing: currentTime })
                .where(eq(userTable.id, remoteJid));

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: "🎣 You didn't catch anything this time. Better luck next time!",
                },
                { quoted: msg }
            );
            return;
        }

        const xpGain = Math.floor(caughtFish.price * caughtFish.chance);

        await db
            .update(userTable)
            .set({
                last_fishing: currentTime,
                xp: userData.xp + xpGain,
            })
            .where(eq(userTable.id, remoteJid));

        await db
            .insert(userInventoryTable)
            .values({
                user_id: remoteJid,
                item_id: caughtFish.id,
                quantity: 1,
            })
            .onDuplicateKeyUpdate({
                set: {
                    quantity: sql`${userInventoryTable.quantity} + 1`,
                },
            });

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    `🎣 You caught a ${caughtFish.name} - ${caughtFish.description}! (${caughtFish.rarity})\n\n` +
                    `✨ XP gained: ${xpGain}`,
            },
            { quoted: msg }
        );
    } catch (error) {
        console.error("Fishing command error:", error);
        await sock.sendMessage(
            msg.key.remoteJid,
            { text: "❌ An error occurred while fishing." },
            { quoted: msg }
        );
    }
}


// INVENTORY COMMAND
async function inventory({ sock, msg }) {
    try {
        const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;

        const userItems = await db
            .select({
                item_name: itemsTable.name,
                quantity: userInventoryTable.quantity,
                category: itemsTable.category,
                rarity: itemsTable.rarity,
            })
            .from(userInventoryTable)
            .leftJoin(
                itemsTable,
                eq(userInventoryTable.item_id, itemsTable.id)
            )
            .where(eq(userInventoryTable.user_id, remoteJid));

        if (userItems.length === 0) {
            await sock.sendMessage(
                msg.key.remoteJid,
                { text: "🎒 Your inventory is empty!" },
                { quoted: msg }
            );
            return;
        }

        let inventoryText = "🎒 *Your Inventory*\n\n";

        const categories = {};
        userItems.forEach((item) => {
            if (!categories[item.category]) {
                categories[item.category] = [];
            }
            categories[item.category].push(item);
        });

        Object.keys(categories).forEach((category) => {
            inventoryText += `**${category.toUpperCase()}**\n`;
            categories[category].forEach((item) => {
                const rarityEmoji =
                    {
                        common: "⚪",
                        rare: "🟡",
                        epic: "🟣",
                        legendary: "🟠",
                    }[item.rarity] || "⚪";

                inventoryText += `${rarityEmoji} ${item.item_name} x${item.quantity}\n`;
            });
            inventoryText += "\n";
        });

        await sock.sendMessage(
            msg.key.remoteJid,
            { text: inventoryText },
            { quoted: msg }
        );
    } catch (error) {
        console.error("Inventory command error:", error);
        await sock.sendMessage(
            msg.key.remoteJid,
            { text: "❌ An error occurred while checking your inventory." },
            { quoted: msg }
        );
    }
}

// BANK COMMANDS
async function bank({ sock, msg }) {
    try {
        const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;

        const bankData = await db
            .select()
            .from(userBankTable)
            .where(eq(userBankTable.user_id, remoteJid))
            .then((res) => res[0]);

        if (!bankData) {
            await db.insert(userBankTable).values({
                user_id: remoteJid,
                balance: 0,
            });
        }

        const balance = bankData ? bankData.balance : 0;

        const bankText =
            `🏦 *Bank Information*\n\n` +
            `💰 Bank Balance: $${formatNumber(balance)}\n\n` +
            `Commands:\n` +
            `• \`.deposit <amount>\` - Deposit money\n` +
            `• \`.withdraw <amount>\` - Withdraw money`;

        await sock.sendMessage(
            msg.key.remoteJid,
            { text: bankText },
            { quoted: msg }
        );
    } catch (error) {
        console.error("Bank command error:", error);
        await sock.sendMessage(
            msg.key.remoteJid,
            { text: "❌ An error occurred while accessing the bank." },
            { quoted: msg }
        );
    }
}

async function deposit({ sock, msg }, amount) {
    try {
        if (!amount || isNaN(amount) || amount <= 0) {
            await sock.sendMessage(
                msg.key.remoteJid,
                { text: "❌ Please enter a valid amount to deposit." },
                { quoted: msg }
            );
            return;
        }

        const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;
        const userData = await getUserData(remoteJid);
        const depositAmount = parseInt(amount);

        if (userData.money < depositAmount) {
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `❌ You don't have enough money. You only have $${formatNumber(
                        userData.money
                    )}`,
                },
                { quoted: msg }
            );
            return;
        }

        // Check if bank account exists
        let bankData = await db
            .select()
            .from(userBankTable)
            .where(eq(userBankTable.user_id, remoteJid))
            .then((res) => res[0]);

        if (!bankData) {
            await db.insert(userBankTable).values({
                user_id: remoteJid,
                balance: depositAmount,
            });
        } else {
            await db
                .update(userBankTable)
                .set({ balance: bankData.balance + depositAmount })
                .where(eq(userBankTable.user_id, remoteJid));
        }

        await db
            .update(userTable)
            .set({ money: userData.money - depositAmount })
            .where(eq(userTable.id, remoteJid));

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text: `🏦 Successfully deposited $${formatNumber(
                    depositAmount
                )} to your bank account!`,
            },
            { quoted: msg }
        );
    } catch (error) {
        console.error("Deposit command error:", error);
        await sock.sendMessage(
            msg.key.remoteJid,
            { text: "❌ An error occurred while depositing money." },
            { quoted: msg }
        );
    }
}

async function withdraw({ sock, msg }, amount) {
    try {
        if (!amount || isNaN(amount) || amount <= 0) {
            await sock.sendMessage(
                msg.key.remoteJid,
                { text: "❌ Please enter a valid amount to withdraw." },
                { quoted: msg }
            );
            return;
        }

        const remoteJid = msg?.key?.participant ?? msg?.key?.remoteJid;
        const userData = await getUserData(remoteJid);
        const withdrawAmount = parseInt(amount);

        const bankData = await db
            .select()
            .from(userBankTable)
            .where(eq(userBankTable.user_id, remoteJid))
            .then((res) => res[0]);

        if (!bankData || bankData.balance < withdrawAmount) {
            const available = bankData ? bankData.balance : 0;
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `❌ Insufficient bank balance. You only have $${formatNumber(
                        available
                    )} in your bank.`,
                },
                { quoted: msg }
            );
            return;
        }

        await db
            .update(userBankTable)
            .set({ balance: bankData.balance - withdrawAmount })
            .where(eq(userBankTable.user_id, remoteJid));

        await db
            .update(userTable)
            .set({ money: userData.money + withdrawAmount })
            .where(eq(userTable.id, remoteJid));

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text: `🏦 Successfully withdrew $${formatNumber(
                    withdrawAmount
                )} from your bank account!`,
            },
            { quoted: msg }
        );
    } catch (error) {
        console.error("Withdraw command error:", error);
        await sock.sendMessage(
            msg.key.remoteJid,
            { text: "❌ An error occurred while withdrawing money." },
            { quoted: msg }
        );
    }
}

// LEADERBOARD COMMAND
async function leaderboard({ sock, msg }, category = "money") {
    try {
        let query;
        let title;

        switch (category.toLowerCase()) {
            case "level":
                query = db
                    .select({
                        name: userTable.name,
                        value: userTable.level,
                    })
                    .from(userTable)
                    .orderBy(db.desc(userTable.level))
                    .limit(10);
                title = "🏆 *Level Leaderboard*";
                break;
            case "xp":
                query = db
                    .select({
                        name: userTable.name,
                        value: userTable.xp,
                    })
                    .from(userTable)
                    .orderBy(db.desc(userTable.xp))
                    .limit(10);
                title = "🏆 *XP Leaderboard*";
                break;
            default:
                query = db
                    .select({
                        name: userTable.name,
                        value: userTable.money,
                    })
                    .from(userTable)
                    .orderBy(db.desc(userTable.money))
                    .limit(10);
                title = "🏆 *Money Leaderboard*";
        }

        const results = await query;

        let leaderboardText = `${title}\n\n`;

        results.forEach((user, index) => {
            const medal =
                index === 0
                    ? "🥇"
                    : index === 1
                    ? "🥈"
                    : index === 2
                    ? "🥉"
                    : `${index + 1}.`;
            const valueFormatted =
                category.toLowerCase() === "money"
                    ? `$${formatNumber(user.value)}`
                    : formatNumber(user.value);

            leaderboardText += `${medal} ${user.name}: ${valueFormatted}\n`;
        });

        await sock.sendMessage(
            msg.key.remoteJid,
            { text: leaderboardText },
            { quoted: msg }
        );
    } catch (error) {
        console.error("Leaderboard command error:", error);
        await sock.sendMessage(
            msg.key.remoteJid,
            { text: "❌ An error occurred while fetching the leaderboard." },
            { quoted: msg }
        );
    }
}

module.exports = {
    daily,
    balance,
    work,
    fishing,
    inventory,
    bank,
    deposit,
    withdraw,
    leaderboard,
    Config: {
        menu: "RPG",
        details: {
            daily: {
                description: "Get random money daily!",
            },
            balance: {
                description: "Check your balance and stats",
            },
            work: {
                description: "Work to earn money and XP",
            },
            fishing: {
                description: "Go fishing to catch fish and earn money",
            },
            inventory: {
                description: "View your inventory items",
            },
            bank: {
                description: "Access your bank account",
            },
            deposit: {
                description: "Deposit money to your bank account",
                usage: ".deposit <amount>",
            },
            withdraw: {
                description: "Withdraw money from your bank account",
            },
            leaderboard: {
                description: "View leaderboards",
            },
        },
    },
};
