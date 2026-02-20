import { db, storeTable } from "../index.ts";

export const storeItems = [
  // Misc / Consumables
  { id: "store001", name: "Fishing Bait", price: 10, description: "Small worms for fishing.", category: "misc" },
  { id: "store002", name: "Fertilizer", price: 20, description: "Helps plants grow faster (cosmetic for now).", category: "misc" },
  { id: "store004", name: "Health Potion", price: 100, description: "Restores some health.", category: "consumable" },
  // Seeds (available to buy)
  { id: "seed_wheat", name: "Wheat Seed", price: 30, description: "A basic wheat seed. Grows in 15 min.", category: "seed" },
  { id: "seed_carrot", name: "Carrot Seed", price: 40, description: "Grows into fresh carrots. 20 min.", category: "seed" },
  { id: "seed_potato", name: "Potato Seed", price: 35, description: "Grows into potatoes. 25 min.", category: "seed" },
  { id: "seed_corn", name: "Corn Seed", price: 60, description: "Tall stalks of corn. 30 min.", category: "seed" },
  { id: "seed_tomato", name: "Tomato Seed", price: 70, description: "Juicy red tomatoes. 35 min.", category: "seed" },
  { id: "seed_sugarcane", name: "Sugarcane Seed", price: 80, description: "Sweet sugarcane. 40 min.", category: "seed" },
  { id: "seed_pumpkin", name: "Pumpkin Seed", price: 150, description: "Grows a big pumpkin. 60 min.", category: "seed" },
  { id: "seed_melon", name: "Melon Seed", price: 160, description: "Grows juicy melons. 60 min.", category: "seed" },
  { id: "seed_cactus", name: "Cactus Seed", price: 300, description: "Desert cactus. 90 min.", category: "seed" },
  { id: "seed_nether_wart", name: "Nether Wart Seed", price: 500, description: "Mystical plant. 120 min.", category: "seed" },
  // Gacha ticket
  { id: "gacha_ticket", name: "Gacha Ticket", price: 500, description: "A ticket to pull from the gacha.", category: "ticket" },
];

async function seed() {
    console.log("Seeding store items...");
    for (const item of storeItems) {
        await db.insert(storeTable).values({
            ...item
        }).onConflictDoUpdate({
            target: storeTable.id,
            set: { ...item }
        });
    }
    console.log("Done seeding store items.");
}

await seed();
process.exit(0);
