import { db, itemsTable } from "../index.ts";

export const fishItems = [
  // === COMMON ===
  { id: "fish001", name: "Sardine", description: "A small and common fish.", price: 50, category: "fish", type: "fish", rarity: "common", stats: null, image: null, sellable: true, chance: 0.6 },
  { id: "fish002", name: "Anchovy", description: "Tiny silver fish.", price: 55, category: "fish", type: "fish", rarity: "common", stats: null, image: null, sellable: true, chance: 0.59 },
  { id: "fish003", name: "Mackerel", description: "Fast swimming fish.", price: 60, category: "fish", type: "fish", rarity: "common", stats: null, image: null, sellable: true, chance: 0.58 },
  { id: "fish004", name: "Tilapia", description: "Freshwater fish, easy to catch.", price: 65, category: "fish", type: "fish", rarity: "common", stats: null, image: null, sellable: true, chance: 0.58 },
  { id: "fish005", name: "Catfish", description: "Bottom-dwelling freshwater fish.", price: 70, category: "fish", type: "fish", rarity: "common", stats: null, image: null, sellable: true, chance: 0.57 },
  { id: "fish006", name: "Carp", description: "Large freshwater fish.", price: 75, category: "fish", type: "fish", rarity: "common", stats: null, image: null, sellable: true, chance: 0.57 },
  { id: "fish007", name: "Minnow", description: "Tiny river fish.", price: 40, category: "fish", type: "fish", rarity: "common", stats: null, image: null, sellable: true, chance: 0.56 },
  { id: "fish008", name: "Perch", description: "Small striped fish.", price: 80, category: "fish", type: "fish", rarity: "common", stats: null, image: null, sellable: true, chance: 0.55 },
  { id: "fish009", name: "Cod", description: "Common saltwater fish.", price: 85, category: "fish", type: "fish", rarity: "common", stats: null, image: null, sellable: true, chance: 0.55 },
  { id: "fish010", name: "Herring", description: "Shoaling fish, often caught in groups.", price: 90, category: "fish", type: "fish", rarity: "common", stats: null, image: null, sellable: true, chance: 0.55 },

  // === UNCOMMON ===
  { id: "fish011", name: "Trout", description: "Freshwater favorite.", price: 120, category: "fish", type: "fish", rarity: "uncommon", stats: null, image: null, sellable: true, chance: 0.3 },
  { id: "fish012", name: "Tuna", description: "Large and valuable fish.", price: 150, category: "fish", type: "fish", rarity: "uncommon", stats: null, image: null, sellable: true, chance: 0.29 },
  { id: "fish013", name: "Snapper", description: "Colorful reef fish.", price: 130, category: "fish", type: "fish", rarity: "uncommon", stats: null, image: null, sellable: true, chance: 0.28 },
  { id: "fish014", name: "Bass", description: "Aggressive freshwater fish.", price: 140, category: "fish", type: "fish", rarity: "uncommon", stats: null, image: null, sellable: true, chance: 0.27 },
  { id: "fish015", name: "Pike", description: "Sharp-toothed predator.", price: 145, category: "fish", type: "fish", rarity: "uncommon", stats: null, image: null, sellable: true, chance: 0.27 },
  { id: "fish016", name: "Grouper", description: "Heavy-bodied reef fish.", price: 135, category: "fish", type: "fish", rarity: "uncommon", stats: null, image: null, sellable: true, chance: 0.26 },
  { id: "fish017", name: "Halibut", description: "Flat ocean fish.", price: 160, category: "fish", type: "fish", rarity: "uncommon", stats: null, image: null, sellable: true, chance: 0.25 },
  { id: "fish018", name: "Barramundi", description: "Asian sea bass.", price: 155, category: "fish", type: "fish", rarity: "uncommon", stats: null, image: null, sellable: true, chance: 0.25 },

  // === RARE ===
  { id: "fish031", name: "Salmon", description: "Migratory fish, highly prized.", price: 300, category: "fish", type: "fish", rarity: "rare", stats: null, image: null, sellable: true, chance: 0.08 },
  { id: "fish032", name: "Swordfish", description: "Fast and strong ocean fish.", price: 350, category: "fish", type: "fish", rarity: "rare", stats: null, image: null, sellable: true, chance: 0.07 },
  { id: "fish033", name: "Marlin", description: "Famous sport fish.", price: 400, category: "fish", type: "fish", rarity: "rare", stats: null, image: null, sellable: true, chance: 0.06 },
  { id: "fish034", name: "Eel", description: "Slimy and slippery fish.", price: 320, category: "fish", type: "fish", rarity: "rare", stats: null, image: null, sellable: true, chance: 0.06 },
  { id: "fish035", name: "Sturgeon", description: "Ancient fish, source of caviar.", price: 380, category: "fish", type: "fish", rarity: "rare", stats: null, image: null, sellable: true, chance: 0.05 },

  // === EPIC ===
  { id: "fish051", name: "Mahi-Mahi", description: "Colorful and rare.", price: 500, category: "fish", type: "fish", rarity: "epic", stats: null, image: null, sellable: true, chance: 0.04 },
  { id: "fish052", name: "Coelacanth", description: "Living fossil fish.", price: 600, category: "fish", type: "fish", rarity: "epic", stats: null, image: null, sellable: true, chance: 0.03 },
  { id: "fish053", name: "Oarfish", description: "Long deep-sea fish.", price: 650, category: "fish", type: "fish", rarity: "epic", stats: null, image: null, sellable: true, chance: 0.02 },

  // === LEGENDARY ===
  { id: "fish071", name: "Golden Fish", description: "A mythical golden fish.", price: 1000, category: "fish", type: "fish", rarity: "legendary", stats: null, image: null, sellable: true, chance: 0.02 },
  { id: "fish072", name: "Dragon Koi", description: "Legendary koi fish of myths.", price: 1200, category: "fish", type: "fish", rarity: "legendary", stats: null, image: null, sellable: true, chance: 0.015 },
  { id: "fish073", name: "Leviathan", description: "Mythical sea beast!", price: 1500, category: "fish", type: "fish", rarity: "legendary", stats: null, image: null, sellable: true, chance: 0.01 },
  { id: "fish074", name: "Flying Fish", description: "A fish that can fly!", price: 2000, category: "flying_fish", type: "fish", rarity: "legendary", stats: null, image: null, sellable: true, chance: 0.01 },
];

async function seed() {
    console.log("Seeding fish items...");
    for (const item of fishItems) {
        await db.insert(itemsTable).values({
            ...item
        }).onConflictDoUpdate({
            target: itemsTable.id,
            set: { ...item }
        });
    }
    console.log("Done seeding fish items.");
}

await seed();
process.exit(0);
