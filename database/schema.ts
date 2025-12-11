import {
    pgTable,
    varchar,
    text,
    index,
    unique,
    integer,
    boolean,
    timestamp,
    real,
    bigint,
} from "drizzle-orm/pg-core";

// Existing tables
export const authTable = pgTable(
    "auth",
    {
        session: varchar("session", { length: 50 }).notNull(),
        id: varchar("id", { length: 100 }).notNull(),
        value: text("value"),
    },
    (auth) => ({
        idxunique: unique("idxunique").on(auth.session, auth.id),
        idxsession: index("idxsession").on(auth.session),
        idxid: index("idxid").on(auth.id),
    })
);

export const userTable = pgTable("user", {
    id: varchar("id", { length: 100 }).notNull().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(0),
    premium: boolean("premium").notNull().default(false),
    money: bigint("money", { mode: "number" }).notNull().default(0),
    daily_time: timestamp("daily_time").defaultNow().notNull(),
    // RPG specific fields
    health: integer("health").notNull().default(100),
    max_health: integer("max_health").notNull().default(100),
    mana: integer("mana").notNull().default(50),
    max_mana: integer("max_mana").notNull().default(50),
    strength: integer("strength").notNull().default(10),
    defense: integer("defense").notNull().default(5),
    agility: integer("agility").notNull().default(5),
    intelligence: integer("intelligence").notNull().default(5),
    last_work: timestamp("last_work"),
    last_fishing: timestamp("last_fishing"),
    last_farming: timestamp("last_farming"),
});

export const storeTable = pgTable("store", {
    id: varchar("id", { length: 100 }).notNull().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    price: bigint("price", { mode: "number" }).notNull(),
    image: varchar("image", { length: 100 }),
    description: text("description"),
    category: varchar("category", { length: 50 }).notNull().default("misc"), // weapon, armor, consumable, misc
    stats: text("stats"), // JSON string for item stats
});

export const itemsTable = pgTable("items", {
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
    chance: real("chance").notNull().default(0.1), 
});

export const userInventoryTable = pgTable(
    "user_inventory",
    {
        user_id: varchar("user_id", { length: 100 }).notNull(),
        item_id: varchar("item_id", { length: 100 }).notNull(),
        quantity: integer("quantity").notNull().default(1),
        created_at: timestamp("created_at").defaultNow().notNull(),
    },
    (inventory) => ({
        idx_user_inventory: index("idx_user_inventory").on(inventory.user_id),
        idx_item_inventory: index("idx_item_inventory").on(inventory.item_id),
        unique_user_item: unique("unique_user_item").on(inventory.user_id, inventory.item_id),
    })
);


// Bank system for secure money storage
export const userBankTable = pgTable("user_bank", {
    user_id: varchar("user_id", { length: 100 }).notNull().primaryKey(),
    balance: bigint("balance", { mode: "number" }).notNull().default(0),
    last_interest: timestamp("last_interest").defaultNow().notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

export const jobsTable = pgTable("jobs", {
    id: varchar("id", { length: 100 }).notNull().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    min_payment: integer("min_payment").notNull(),
    max_payment: integer("max_payment").notNull(),
    cooldown: integer("cooldown").notNull(), // in minutes
    required_level: integer("required_level").notNull().default(1),
    energy_cost: integer("energy_cost").notNull().default(10),
});

// Leaderboard cache table for performance
export const leaderboardTable = pgTable(
    "leaderboard",
    {
        id: varchar("id", { length: 100 }).notNull().primaryKey(),
        user_id: varchar("user_id", { length: 100 }).notNull(),
        category: varchar("category", { length: 50 }).notNull(), // money, level, xp, etc
        value: bigint("value", { mode: "number" }).notNull(),
        rank: integer("rank").notNull(),
        updated_at: timestamp("updated_at").defaultNow().notNull(),
    },
    (leaderboard) => ({
        idx_category_rank: index("idx_category_rank").on(leaderboard.category, leaderboard.rank),
        idx_user_leaderboard: index("idx_user_leaderboard").on(leaderboard.user_id),
    })
);

// Transaction logs for money transfers
export const transactionTable = pgTable(
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
    (transaction) => ({
        idx_from_user: index("idx_from_user").on(transaction.from_user),
        idx_to_user: index("idx_to_user").on(transaction.to_user),
        idx_transaction_type: index("idx_transaction_type").on(transaction.type),
    })
);

// Existing tables
export const messageNotificationTable = pgTable("message_notification", {
    id: varchar("id", { length: 100 }).notNull().primaryKey(),
    lat: real("lat").notNull(),
    lon: real("lon").notNull(),
});

export const earthquakeTable = pgTable("earthquake", {
    event_id: varchar("event_id", { length: 100 }).notNull().primaryKey(),
    status: varchar("status", { length: 20 }).notNull(),
    waktu: timestamp("waktu", { mode: "string" }).notNull(),
    lintang: real("lintang").notNull(),
    bujur: real("bujur").notNull(),
    dalam: integer("dalam").notNull(),
    mag: real("mag").notNull(),
    fokal: varchar("fokal", { length: 50 }).notNull(),
    area: varchar("area", { length: 100 }).notNull(),
});

export const commandLogTable = pgTable("command_log", {
    id: varchar("id", { length: 100 }).notNull(),
    command: varchar("command", { length: 100 }).notNull(),
    args: text("args").notNull(),
    timestamp: timestamp("timestamp", { mode: "string" })
        .notNull()
        .defaultNow(),
    isGroup: boolean("isGroup").notNull().default(false),
});
