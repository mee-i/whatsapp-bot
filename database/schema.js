import {
    mysqlTable,
    varchar,
    text,
    index,
    unique,
    int,
    boolean,
    timestamp,
    float,
    bigint,
} from "drizzle-orm/mysql-core";

// Existing tables
export const authTable = mysqlTable(
    "auth",
    {
        session: varchar("session", { length: 50 }).notNull(),
        id: varchar("id", { length: 100 }).notNull(),
        value: text("value"),
    },
    (auth) => [
        unique("idxunique").on(auth.session, auth.id),
        index("idxsession").on(auth.session),
        index("idxid").on(auth.id),
    ]
);

export const userTable = mysqlTable("user", {
    id: varchar("id", { length: 100 }).notNull().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    xp: int("xp").notNull().default(0),
    level: int("level").notNull().default(0),
    premium: boolean("premium").notNull().default(false),
    money: bigint("money", { mode: "number" }).notNull().default(0),
    daily_time: timestamp().defaultNow().notNull(),
    // RPG specific fields
    health: int("health").notNull().default(100),
    max_health: int("max_health").notNull().default(100),
    mana: int("mana").notNull().default(50),
    max_mana: int("max_mana").notNull().default(50),
    strength: int("strength").notNull().default(10),
    defense: int("defense").notNull().default(5),
    agility: int("agility").notNull().default(5),
    intelligence: int("intelligence").notNull().default(5),
    last_work: timestamp("last_work"),
    last_fishing: timestamp("last_fishing"),
    last_farming: timestamp("last_farming"),
});

export const storeTable = mysqlTable("store", {
    id: varchar("id", { length: 100 }).notNull().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    price: bigint("price", { mode: "number" }).notNull(),
    image: varchar("image", { length: 100 }),
    description: text("description"),
    category: varchar("category", { length: 50 }).notNull().default("misc"), // weapon, armor, consumable, misc
    stats: text("stats"), // JSON string for item stats
});

export const itemsTable = mysqlTable("items", {
    id: varchar("id", { length: 100 }).notNull().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description").notNull(),
    price: bigint("price", { mode: "number" }).notNull(),
    image: varchar("image", { length: 255 }),
    category: varchar("category", { length: 50 }).notNull().default("misc"),
    type: varchar("type", { length: 50 }).notNull().default("misc"),
    rarity: varchar("rarity", { length: 20 }).notNull().default("common"),
    stats: text("stats"),
    sellable: boolean("sellable").notNull().default(true),
    chance: float("chance").notNull().default(0.1), 
});

export const userInventoryTable = mysqlTable(
    "user_inventory",
    {
        user_id: varchar("user_id", { length: 100 }).notNull(),
        item_id: varchar("item_id", { length: 100 }).notNull(),
        quantity: int("quantity").notNull().default(1),
        created_at: timestamp("created_at").defaultNow().notNull(),
    },
    (inventory) => [
        index("idx_user_inventory").on(inventory.user_id),
        index("idx_item_inventory").on(inventory.item_id),
        unique("unique_user_item").on(inventory.user_id, inventory.item_id),
    ]
);


// Bank system for secure money storage
export const userBankTable = mysqlTable("user_bank", {
    user_id: varchar("user_id", { length: 100 }).notNull().primaryKey(),
    balance: bigint("balance", { mode: "number" }).notNull().default(0),
    last_interest: timestamp("last_interest").defaultNow().notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

export const jobsTable = mysqlTable("jobs", {
    id: varchar("id", { length: 100 }).notNull().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    min_payment: int("min_payment").notNull(),
    max_payment: int("max_payment").notNull(),
    cooldown: int("cooldown").notNull(), // in minutes
    required_level: int("required_level").notNull().default(1),
    energy_cost: int("energy_cost").notNull().default(10),
});

// Leaderboard cache table for performance
export const leaderboardTable = mysqlTable(
    "leaderboard",
    {
        id: varchar("id", { length: 100 }).notNull().primaryKey(),
        user_id: varchar("user_id", { length: 100 }).notNull(),
        category: varchar("category", { length: 50 }).notNull(), // money, level, xp, etc
        value: bigint("value", { mode: "number" }).notNull(),
        rank: int("rank").notNull(),
        updated_at: timestamp("updated_at").defaultNow().notNull(),
    },
    (leaderboard) => [
        index("idx_category_rank").on(leaderboard.category, leaderboard.rank),
        index("idx_user_leaderboard").on(leaderboard.user_id),
    ]
);

// Transaction logs for money transfers
export const transactionTable = mysqlTable(
    "transaction",
    {
        id: varchar("id", { length: 100 }).notNull().primaryKey(),
        from_user: varchar("from_user", { length: 100 }),
        to_user: varchar("to_user", { length: 100 }),
        amount: bigint("amount", { mode: "number" }).notNull(),
        type: varchar("type", { length: 50 }).notNull(), // transfer, purchase, sale, reward, etc
        description: text("description"),
        created_at: timestamp("created_at").defaultNow().notNull(),
    },
    (transaction) => [
        index("idx_from_user").on(transaction.from_user),
        index("idx_to_user").on(transaction.to_user),
        index("idx_transaction_type").on(transaction.type),
    ]
);

// Existing tables
export const messageNotificationTable = mysqlTable("message_notification", {
    id: varchar("id", { length: 100 }).notNull().primaryKey(),
    lat: float("lat").notNull(),
    lon: float("lon").notNull(),
});

export const earthquakeTable = mysqlTable("earthquake", {
    event_id: varchar("event_id", { length: 100 }).notNull().primaryKey(),
    status: varchar("status", { length: 20 }).notNull(),
    waktu: timestamp("waktu", { mode: "string" }).notNull(),
    lintang: float("lintang").notNull(),
    bujur: float("bujur").notNull(),
    dalam: int("dalam").notNull(),
    mag: float("mag").notNull(),
    fokal: varchar("fokal", { length: 50 }).notNull(),
    area: varchar("area", { length: 100 }).notNull(),
});

export const commandLogTable = mysqlTable("command_log", {
    id: varchar("id", { length: 100 }).notNull(),
    command: varchar("command", { length: 100 }).notNull(),
    args: text("args").notNull(),
    timestamp: timestamp("timestamp", { mode: "string" })
        .notNull()
        .defaultNow(),
    isGroup: boolean("isGroup").notNull().default(false),
});
