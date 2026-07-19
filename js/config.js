/* ============================================================================
 * Sakura Sushi Catering — Core Data Model (config.js)
 * ----------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for all business data. Fully static (no backend).
 * A later "polish" pass will restyle the UI — DO NOT rename the exported
 * globals, item IDs, or function names below; the quote builder, booking form,
 * and admin page all depend on them.
 *
 * GLOBALS EXPOSED (attached to window):
 *   SITE, MENU, MENU_FLAT, PRICING_TIERS
 *   (Store lives in js/store.js, getMenu()/formatMoney() in js/menu.js)
 *
 * MENU ITEM SHAPE (every item, every category):
 *   { id, name, desc, price, unit, category, serves, pieces, tags[] }
 *   - id     : STABLE unique id (e.g. "pkg-omakase"). Never reuse/rename.
 *   - price  : USD. PER PERSON for packages; flat unit price otherwise.
 *   - unit   : "per person" | "each" | "tray" | "platter"
 *   - serves : approx people one unit serves (recommender uses this; packages=1)
 *   - tags   : "vegetarian","vegan","gluten-free","raw","cooked"
 *
 * PRICE OVERRIDES: admin can override any item price -> localStorage
 * Store.KEYS.PRICES = { [itemId]: number }. UI must read prices via getMenu()
 * (js/menu.js), NOT window.MENU directly.
 * ==========================================================================*/

window.SITE = {
  name: "Sakura Sushi Catering",
  tagline: "Fresh, hand-rolled sushi catering for events of every size.",
  phone: "+962 79 555 0182",
  email: "orders@sakurasushicatering.jo",
  serviceArea: "Greater Amman — within 30 km of Downtown Amman",
  minOrder: 250,     // USD — minimum order subtotal to submit a quote
  deliveryFee: 45,   // USD — flat fee when delivery (not pickup) is chosen
  leadTimeDays: 3    // minimum days ahead an event must be booked
};

// Per-person tiers: quote builder uses these ONLY for the package+guestcount
// quick-estimate path. Chosen tier = highest whose minGuests <= guestCount.
window.PRICING_TIERS = [
  { id: "tier-intimate", label: "Intimate (10–24 guests)", minGuests: 10,  pricePerPerson: 28 },
  { id: "tier-standard", label: "Standard (25–49 guests)", minGuests: 25,  pricePerPerson: 24 },
  { id: "tier-large",    label: "Large (50–99 guests)",    minGuests: 50,  pricePerPerson: 21 },
  { id: "tier-grand",    label: "Grand (100+ guests)",     minGuests: 100, pricePerPerson: 18 }
];

window.MENU = {
  // PACKAGES — priced PER PERSON. serves:1 so recommender treats qty as headcount.
  packages: [
    { id: "pkg-omakase", name: "Omakase Feast", category: "packages", unit: "per person", serves: 1, pieces: 0,
      price: 32, tags: ["raw","cooked"],
      desc: "Chef's premium selection: nigiri, sashimi, and signature specialty rolls, plated to impress." },
    { id: "pkg-classic", name: "Classic Roll Spread", category: "packages", unit: "per person", serves: 1, pieces: 0,
      price: 24, tags: ["cooked"],
      desc: "A crowd-pleasing mix of California, spicy tuna, and shrimp tempura rolls with edamame." },
    { id: "pkg-garden", name: "Garden Vegetarian", category: "packages", unit: "per person", serves: 1, pieces: 0,
      price: 20, tags: ["vegetarian","vegan"],
      desc: "All-veggie rolls — avocado, cucumber, sweet potato tempura, and inari — plus miso soup." }
  ],
  // PLATTERS / PARTY TRAYS — flat price each, serves several.
  platters: [
    { id: "plt-rainbow", name: "Rainbow Party Tray", category: "platters", unit: "tray", serves: 8, pieces: 64,
      price: 95, tags: ["raw","cooked"],
      desc: "64 pieces: assorted maki and nigiri topped with fresh salmon, tuna, and yellowtail." },
    { id: "plt-dragon", name: "Dragon Deluxe Tray", category: "platters", unit: "tray", serves: 10, pieces: 80,
      price: 120, tags: ["cooked"],
      desc: "80 pieces of our chef's specialty rolls: dragon, caterpillar, and volcano." },
    { id: "plt-sashimi", name: "Premium Sashimi Boat", category: "platters", unit: "platter", serves: 12, pieces: 60,
      price: 165, tags: ["raw"],
      desc: "60 slices of the day's freshest fish, artfully arranged on a wooden boat." },
    { id: "plt-veggie", name: "Garden Veggie Tray", category: "platters", unit: "tray", serves: 8, pieces: 64,
      price: 78, tags: ["vegetarian","vegan"],
      desc: "64 pieces of colorful vegetable maki — no fish, all flavor." }
  ],
  // A LA CARTE ROLLS — flat price each, one roll (8 pcs) serves ~2.
  rolls: [
    { id: "roll-california", name: "California Roll", category: "rolls", unit: "each", serves: 2, pieces: 8,
      price: 8, tags: ["cooked"], desc: "Crab, avocado, cucumber. The timeless classic." },
    { id: "roll-spicytuna", name: "Spicy Tuna Roll", category: "rolls", unit: "each", serves: 2, pieces: 8,
      price: 10, tags: ["raw"], desc: "Fresh tuna with a kick of spicy mayo and scallion." },
    { id: "roll-dragon", name: "Dragon Roll", category: "rolls", unit: "each", serves: 2, pieces: 8,
      price: 14, tags: ["cooked"], desc: "Shrimp tempura and eel, crowned with avocado." },
    { id: "roll-salmonavo", name: "Salmon Avocado Roll", category: "rolls", unit: "each", serves: 2, pieces: 8,
      price: 9, tags: ["raw"], desc: "Buttery salmon and ripe avocado." },
    { id: "roll-sweetpotato", name: "Sweet Potato Roll", category: "rolls", unit: "each", serves: 2, pieces: 8,
      price: 7, tags: ["vegetarian","vegan"], desc: "Crispy tempura sweet potato with a sweet glaze." },
    { id: "roll-rainbow", name: "Rainbow Roll", category: "rolls", unit: "each", serves: 2, pieces: 8,
      price: 13, tags: ["raw"], desc: "California roll draped in assorted sashimi." }
  ],
  // ADD-ONS — flat price each.
  addons: [
    { id: "add-edamame", name: "Edamame (large)", category: "addons", unit: "each", serves: 6, pieces: 0,
      price: 18, tags: ["vegan","gluten-free"], desc: "Steamed and lightly salted soybeans." },
    { id: "add-miso", name: "Miso Soup (batch, serves 10)", category: "addons", unit: "each", serves: 10, pieces: 0,
      price: 25, tags: ["vegetarian"], desc: "Traditional miso with tofu and scallion." },
    { id: "add-gyoza", name: "Pork Gyoza (2 dozen)", category: "addons", unit: "each", serves: 8, pieces: 24,
      price: 30, tags: ["cooked"], desc: "Pan-fried dumplings with dipping sauce." },
    { id: "add-mochi", name: "Mochi Ice Cream (dozen)", category: "addons", unit: "each", serves: 12, pieces: 12,
      price: 24, tags: ["vegetarian","gluten-free"], desc: "Assorted flavors of chewy mochi ice cream." }
  ]
};

// Flat list of every menu item across categories — convenience for lookups.
window.MENU_FLAT = [].concat(
  window.MENU.packages, window.MENU.platters, window.MENU.rolls, window.MENU.addons
);
