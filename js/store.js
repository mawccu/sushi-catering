/* ============================================================================
 * Store, localStorage persistence layer (js/store.js)
 * ----------------------------------------------------------------------------
 * All persisted state for the site lives here. No backend (static site).
 *
 * KEYS & SCHEMAS
 * --------------
 * Store.KEYS.REQUESTS -> "sakura_requests" : Request[]
 *   Request = {
 *     id:         string    // "req-" + timestamp, unique
 *     createdAt:  number     // Date.now() ms, used for reverse-chron sort
 *     status:     "new" | "confirmed"   // owner toggles in admin
 *     // --- event details ---
 *     eventDate:  string    // "YYYY-MM-DD"
 *     guests:     number
 *     address:    string    // the venue / event location (on-site catering only)
 *     // --- contact ---
 *     name:       string
 *     email:      string
 *     phone:      string
 *     notes:      string    // allergies / dietary / special requests
 *     // --- order snapshot (captured from quote builder at submit time) ---
 *     items:      { id, name, qty, price, unit, lineTotal }[]  // price = price AT submit
 *     subtotal:   number
 *     total:      number
 *   }
 *
 * Store.KEYS.PRICES -> "sakura_price_overrides" : { [itemId]: number }
 *   Sparse map of admin price overrides. getMenu() (js/menu.js) applies these.
 * ==========================================================================*/

window.Store = (function () {
  var KEYS = {
    REQUESTS: "sakura_requests",
    PRICES: "sakura_price_overrides"
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("Store.read failed for", key, e);
      return fallback;
    }
  }

  function write(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      console.warn("Store.write failed for", key, e);
      return false;
    }
  }

  /* -------- Requests -------- */
  function getRequests() {
    return read(KEYS.REQUESTS, []);
  }

  // Adds a request; assigns id/createdAt/status. Returns the stored record.
  function addRequest(req) {
    var all = getRequests();
    var record = Object.assign({
      id: "req-" + Date.now(),
      createdAt: Date.now(),
      status: "new"
    }, req);
    all.push(record);
    write(KEYS.REQUESTS, all);
    return record;
  }

  function updateRequestStatus(id, status) {
    var all = getRequests();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) { all[i].status = status; break; }
    }
    write(KEYS.REQUESTS, all);
  }

  function deleteRequest(id) {
    var all = getRequests().filter(function (r) { return r.id !== id; });
    write(KEYS.REQUESTS, all);
  }

  /* -------- Price overrides -------- */
  function getPriceOverrides() {
    return read(KEYS.PRICES, {});
  }

  function setPriceOverride(itemId, price) {
    var o = getPriceOverrides();
    if (price === null || price === undefined || isNaN(price)) {
      delete o[itemId];
    } else {
      o[itemId] = Number(price);
    }
    write(KEYS.PRICES, o);
  }

  function clearPriceOverrides() {
    write(KEYS.PRICES, {});
  }

  return {
    KEYS: KEYS,
    getRequests: getRequests,
    addRequest: addRequest,
    updateRequestStatus: updateRequestStatus,
    deleteRequest: deleteRequest,
    getPriceOverrides: getPriceOverrides,
    setPriceOverride: setPriceOverride,
    clearPriceOverrides: clearPriceOverrides
  };
})();
