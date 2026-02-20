import { db, itemsTable, storeTable } from "../index.ts";

// Gacha ticket item
const gachaTicket = {
    id: "gacha_ticket",
    name: "Gacha Ticket",
    description: "A ticket to pull from the gacha.",
    price: 500,
    category: "ticket",
    type: "ticket",
    rarity: "uncommon",
    sellable: false,
    chance: 0,
};

// Gacha-exclusive items (items only obtainable through gacha)
const gachaItems = [
    { id: "gacha_lucky_charm", name: "Lucky Charm", description: "A charm that brings good fortune.", price: 800, category: "gacha", type: "accessory", rarity: "rare", sellable: true, chance: 0 },
    { id: "gacha_golden_rod", name: "Golden Fishing Rod", description: "Increases rare fish catch rate.", price: 2000, category: "gacha", type: "tool", rarity: "epic", sellable: true, chance: 0 },
    { id: "gacha_enchanted_hoe", name: "Enchanted Hoe", description: "Farming tool that boosts yield.", price: 2500, category: "gacha", type: "tool", rarity: "epic", sellable: true, chance: 0 },
    { id: "gacha_diamond", name: "Diamond", description: "A sparkling precious gem.", price: 5000, category: "gacha", type: "gem", rarity: "legendary", sellable: true, chance: 0 },
    { id: "gacha_ancient_scroll", name: "Ancient Scroll", description: "Contains forgotten knowledge.", price: 3000, category: "gacha", type: "misc", rarity: "legendary", sellable: true, chance: 0 },
];

async function seed() {
    console.log("Seeding gacha items...");

    // Seed gacha ticket as an item
    await db.insert(itemsTable).values({
        ...gachaTicket,
        image: null,
        stats: null,
    }).onConflictDoUpdate({
        target: itemsTable.id,
        set: { ...gachaTicket }
    });

    // Also add gacha ticket to store
    await db.insert(storeTable).values({
        id: gachaTicket.id,
        name: gachaTicket.name,
        price: gachaTicket.price,
        description: gachaTicket.description,
        category: "ticket",
    }).onConflictDoUpdate({
        target: storeTable.id,
        set: { name: gachaTicket.name, price: gachaTicket.price, description: gachaTicket.description }
    });

    // Seed gacha-exclusive items
    for (const item of gachaItems) {
        await db.insert(itemsTable).values({
            ...item,
            image: null,
            stats: null,
        }).onConflictDoUpdate({
            target: itemsTable.id,
            set: { ...item }
        });
    }

    console.log("Done seeding gacha items.");
}

await seed();
process.exit(0);
