import { db, itemsTable } from "../index.ts";

// Seeds - plantable items that grow into crops
const seeds = [
    // Common seeds
    { id: "seed_wheat", name: "Wheat Seed", description: "A basic wheat seed.", price: 30, category: "seed", type: "seed", rarity: "common", sellable: false, chance: 0, grow_time: 15, min_yield: 3, max_yield: 5, harvest_item_id: "crop_wheat" },
    { id: "seed_carrot", name: "Carrot Seed", description: "Grows into fresh carrots.", price: 40, category: "seed", type: "seed", rarity: "common", sellable: false, chance: 0, grow_time: 20, min_yield: 2, max_yield: 4, harvest_item_id: "crop_carrot" },
    { id: "seed_potato", name: "Potato Seed", description: "Grows into potatoes.", price: 35, category: "seed", type: "seed", rarity: "common", sellable: false, chance: 0, grow_time: 25, min_yield: 2, max_yield: 5, harvest_item_id: "crop_potato" },
    // Uncommon seeds
    { id: "seed_corn", name: "Corn Seed", description: "Tall stalks of corn.", price: 60, category: "seed", type: "seed", rarity: "uncommon", sellable: false, chance: 0, grow_time: 30, min_yield: 3, max_yield: 5, harvest_item_id: "crop_corn" },
    { id: "seed_tomato", name: "Tomato Seed", description: "Juicy red tomatoes.", price: 70, category: "seed", type: "seed", rarity: "uncommon", sellable: false, chance: 0, grow_time: 35, min_yield: 3, max_yield: 6, harvest_item_id: "crop_tomato" },
    { id: "seed_sugarcane", name: "Sugarcane Seed", description: "Sweet and tall sugarcane.", price: 80, category: "seed", type: "seed", rarity: "uncommon", sellable: false, chance: 0, grow_time: 40, min_yield: 2, max_yield: 4, harvest_item_id: "crop_sugarcane" },
    // Rare seeds
    { id: "seed_pumpkin", name: "Pumpkin Seed", description: "Grows a big pumpkin.", price: 150, category: "seed", type: "seed", rarity: "rare", sellable: false, chance: 0, grow_time: 60, min_yield: 1, max_yield: 3, harvest_item_id: "crop_pumpkin" },
    { id: "seed_melon", name: "Melon Seed", description: "Grows juicy melons.", price: 160, category: "seed", type: "seed", rarity: "rare", sellable: false, chance: 0, grow_time: 60, min_yield: 2, max_yield: 4, harvest_item_id: "crop_melon" },
    // Epic seeds
    { id: "seed_cactus", name: "Cactus Seed", description: "Desert cactus, very valuable.", price: 300, category: "seed", type: "seed", rarity: "epic", sellable: false, chance: 0, grow_time: 90, min_yield: 1, max_yield: 3, harvest_item_id: "crop_cactus" },
    // Legendary seeds
    { id: "seed_nether_wart", name: "Nether Wart Seed", description: "Mystical otherworldly plant.", price: 500, category: "seed", type: "seed", rarity: "legendary", sellable: false, chance: 0, grow_time: 120, min_yield: 2, max_yield: 5, harvest_item_id: "crop_nether_wart" },
];

// Crops - harvested items, these are sellable
const crops = [
    { id: "crop_wheat", name: "Wheat", description: "Freshly harvested wheat.", price: 20, category: "crop", type: "crop", rarity: "common", sellable: true, chance: 0 },
    { id: "crop_carrot", name: "Carrot", description: "A crunchy orange carrot.", price: 30, category: "crop", type: "crop", rarity: "common", sellable: true, chance: 0 },
    { id: "crop_potato", name: "Potato", description: "A starchy potato.", price: 25, category: "crop", type: "crop", rarity: "common", sellable: true, chance: 0 },
    { id: "crop_corn", name: "Corn", description: "Golden ear of corn.", price: 40, category: "crop", type: "crop", rarity: "uncommon", sellable: true, chance: 0 },
    { id: "crop_tomato", name: "Tomato", description: "Ripe red tomato.", price: 45, category: "crop", type: "crop", rarity: "uncommon", sellable: true, chance: 0 },
    { id: "crop_sugarcane", name: "Sugarcane", description: "Sweet sugarcane stalk.", price: 55, category: "crop", type: "crop", rarity: "uncommon", sellable: true, chance: 0 },
    { id: "crop_pumpkin", name: "Pumpkin", description: "A massive orange pumpkin.", price: 120, category: "crop", type: "crop", rarity: "rare", sellable: true, chance: 0 },
    { id: "crop_melon", name: "Melon", description: "Juicy melon slice.", price: 100, category: "crop", type: "crop", rarity: "rare", sellable: true, chance: 0 },
    { id: "crop_cactus", name: "Cactus", description: "Prickly desert cactus.", price: 250, category: "crop", type: "crop", rarity: "epic", sellable: true, chance: 0 },
    { id: "crop_nether_wart", name: "Nether Wart", description: "A mystical crop from another dimension.", price: 400, category: "crop", type: "crop", rarity: "legendary", sellable: true, chance: 0 },
];

async function seed() {
    console.log("Seeding farm seeds and crops...");
    for (const item of [...seeds, ...crops]) {
        await db.insert(itemsTable).values({
            ...item,
            image: null,
            stats: null,
        }).onConflictDoUpdate({
            target: itemsTable.id,
            set: { ...item }
        });
    }
    console.log("Done seeding farm items.");
}

await seed();
process.exit(0);
