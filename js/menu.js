/* ============================================================================
 * Menu helpers (js/menu.js)
 * ----------------------------------------------------------------------------
 * Read menu data WITH admin price overrides applied. Always use getMenu() /
 * getItem() in UI code instead of touching window.MENU directly, so admin price
 * edits are reflected everywhere.
 *
 * EXPOSES (window):
 *   getMenu()            -> deep-ish copy of MENU with overridden prices applied
 *   getMenuFlat()        -> flat array of all items (prices applied)
 *   getItem(id)          -> single item (price applied) or null
 *   formatMoney(n)       -> "JD 12.00"
 *   recommendPlatters(g) -> [{item, qty}] suggestion for g guests (see below)
 *   estimatePackage(pkgId, guests) -> { tier, pricePerPerson, total }
 * ==========================================================================*/

(function () {
  function applyOverrides(item, overrides) {
    var copy = Object.assign({}, item);
    if (overrides && overrides[item.id] !== undefined) {
      copy.price = Number(overrides[item.id]);
    }
    return copy;
  }

  window.getMenu = function () {
    var overrides = window.Store ? Store.getPriceOverrides() : {};
    var out = {};
    Object.keys(window.MENU).forEach(function (cat) {
      out[cat] = window.MENU[cat].map(function (it) { return applyOverrides(it, overrides); });
    });
    return out;
  };

  window.getMenuFlat = function () {
    var m = window.getMenu();
    return [].concat(m.packages, m.platters, m.rolls, m.addons);
  };

  window.getItem = function (id) {
    var found = window.getMenuFlat().filter(function (i) { return i.id === id; })[0];
    return found || null;
  };

  window.formatMoney = function (n) {
    return "JD " + (Math.round(Number(n) * 100) / 100).toFixed(2);
  };

  // Recommend party trays for a guest count. Strategy: use the two flagship
  // party trays (rainbow + veggie mix) and cover headcount by their `serves`.
  // Returns [{item, qty}]. Simple, transparent math the UI can display.
  window.recommendPlatters = function (guests) {
    guests = Number(guests) || 0;
    if (guests < 1) return [];
    var m = window.getMenu();
    var rainbow = m.platters.filter(function (p) { return p.id === "plt-rainbow"; })[0];
    if (!rainbow) return [];
    // ~70% eat the mixed tray, ~30% covered by veggie tray for variety.
    var mainGuests = Math.ceil(guests * 0.7);
    var veggieGuests = guests - mainGuests;
    var out = [];
    var rainbowQty = Math.max(1, Math.ceil(mainGuests / rainbow.serves));
    out.push({ item: rainbow, qty: rainbowQty });
    var veggie = m.platters.filter(function (p) { return p.id === "plt-veggie"; })[0];
    if (veggie && veggieGuests > 0) {
      out.push({ item: veggie, qty: Math.max(1, Math.ceil(veggieGuests / veggie.serves)) });
    }
    return out;
  };

  // Per-person package estimate for a guest count.
  window.estimatePackage = function (pkgId, guests) {
    guests = Number(guests) || 0;
    var m = window.getMenu();
    var pkg = m.packages.filter(function (p) { return p.id === pkgId; })[0];
    if (!pkg) return null;
    // Package price is per-person and already in the menu. Tiers give a volume
    // discount reference; we use max(package base, tier) transparency: here we
    // simply use the package per-person price (packages already competitively
    // priced) but expose the tier for messaging.
    var tier = null;
    for (var i = 0; i < window.PRICING_TIERS.length; i++) {
      if (guests >= window.PRICING_TIERS[i].minGuests) tier = window.PRICING_TIERS[i];
    }
    var perPerson = pkg.price;
    return { pkg: pkg, tier: tier, pricePerPerson: perPerson, total: perPerson * guests, guests: guests };
  };
})();
