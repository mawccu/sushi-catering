/* ============================================================================
 * Catering Builder + Booking Form controller (js/builder.js)
 * ----------------------------------------------------------------------------
 * A simplified, catering-first flow for index.html #builder / #booking:
 *
 *   1. Guests + appetite  -> we estimate pieces-per-guest, total pieces, and $$.
 *   2. Pick sushi BY THE TEN  -> each roll type steps in 10-piece units.
 *   3. "Customize each piece" (advanced) -> steppers switch to 1-piece precision.
 *   + Auto-fill a balanced spread that covers the estimate.
 *   + Optional sides & extras (add-ons, priced each).
 *
 * Rolls are sold by the piece here (per-piece price = listed roll price / its
 * piece count); everything rolls up into the ink "receipt" cart and the booking
 * form, which snapshots the order into a Request via Store (unchanged contract).
 *
 * STABLE DOM IDS expected in index.html:
 *   #guest-count           guest count input (also drives the estimate)
 *   #appetite .apbtn[data-per]   appetite buttons (pieces per guest)
 *   #cater-estimate        live estimate line
 *   #cater-autofill        auto-fill button
 *   #adv-toggle            "customize each piece" checkbox
 *   #cater-progress        pieces-selected progress
 *   #cater-grid            roll cards render here
 *   #cater-addons          add-on rows render here
 *   #cart-lines/#cart-subtotal/#cart-deliveryfee/#cart-total/#cart-warning
 *   #booking-form (+ fields), #address-row, #booking-confirm, #form-errors
 *
 * PUBLIC (window): Builder.recalc(), Builder.getOrder()
 * ==========================================================================*/

window.Builder = (function () {
  var ROLLS = [], ADDONS = [], avgPerPiece = 1;
  var guests = 0, perGuest = 10, advanced = false;
  var pieces = {};   // rollId  -> pieces
  var addons = {};   // addonId -> count

  function $(id) { return document.getElementById(id); }
  function money(n) { return window.formatMoney(n); }
  function perPiece(r) { return r.price / (r.pieces || 1); }
  function getFulfillment() {
    var r = document.querySelector('input[name="fulfillment"]:checked');
    return r ? r.value : "pickup";
  }
  function step() { return advanced ? 1 : 10; }
  function targetPieces() { return (guests || 0) * perGuest; }
  function sumPieces() { var s = 0; ROLLS.forEach(function (r) { s += pieces[r.id] || 0; }); return s; }

  /* ---- mutations ---- */
  function setPieces(id, val) {
    val = Math.max(0, Math.floor(Number(val) || 0));
    if (val === 0) delete pieces[id]; else pieces[id] = val;
    syncGrid(); recalc();
  }
  function stepPieces(id, dir) { setPieces(id, (pieces[id] || 0) + dir * step()); }
  function setAddon(id, val) {
    val = Math.max(0, Math.floor(Number(val) || 0));
    if (val === 0) delete addons[id]; else addons[id] = val;
    syncGrid(); recalc();
  }
  function stepAddon(id, dir) { setAddon(id, (addons[id] || 0) + dir); }

  function setGuests(v) {
    guests = Math.max(0, Math.floor(Number(v) || 0));
    var bf = $("f-guests"); if (bf && guests) bf.value = guests;   // keep booking form in sync
    recalc();
  }
  function setAppetite(p) {
    perGuest = p;
    Array.prototype.forEach.call(document.querySelectorAll("#appetite .apbtn"), function (b) {
      b.classList.toggle("on", Number(b.getAttribute("data-per")) === p);
      b.setAttribute("aria-pressed", String(Number(b.getAttribute("data-per")) === p));
    });
    recalc();
  }

  /* ---- balanced auto-fill (covers the estimate, in 10s) ---- */
  function autofill() {
    var tp = targetPieces();
    if (tp < 10) { setGuests(guests); renderEstimate(); flashEstimate(); return; }
    var order = ["roll-california", "roll-spicytuna", "roll-salmonavo", "roll-rainbow", "roll-dragon", "roll-sweetpotato"];
    var ids = order.filter(function (id) { return ROLLS.some(function (r) { return r.id === id; }); });
    ROLLS.forEach(function (r) { delete pieces[r.id]; });
    var total = 0, i = 0;
    while (total < tp && i < 500) { var id = ids[i % ids.length]; pieces[id] = (pieces[id] || 0) + 10; total += 10; i++; }
    syncGrid(); recalc();
  }

  /* ---- rendering ---- */
  function renderGrid() {
    var host = $("cater-grid"); if (!host) return;
    host.innerHTML = ROLLS.map(function (r) {
      var tags = (r.tags || []).join(" · ");
      return '<div class="cater-card" data-roll="' + r.id + '">' +
        '<div class="cc-top"><span class="cc-name">' + r.name + '</span>' +
        '<span class="cc-price" data-price="' + r.id + '"></span></div>' +
        '<p class="cc-desc">' + r.desc + '</p>' +
        '<div class="cc-foot">' +
          '<span class="cc-tags mono">' + tags + '</span>' +
          '<span class="cc-step">' +
            '<button type="button" data-dec="' + r.id + '" aria-label="fewer ' + r.name + '">–</button>' +
            '<input type="number" min="0" step="10" value="0" data-qty="' + r.id + '" aria-label="pieces of ' + r.name + '">' +
            '<button type="button" data-inc="' + r.id + '" aria-label="more ' + r.name + '">+</button>' +
          '</span>' +
        '</div></div>';
    }).join("");
  }
  function renderAddons() {
    var host = $("cater-addons"); if (!host) return;
    host.innerHTML = ADDONS.map(function (a) {
      return '<div class="cater-addon" data-addon="' + a.id + '">' +
        '<span class="ca-name">' + a.name + '</span>' +
        '<span class="ca-price mono">' + money(a.price) + '</span>' +
        '<span class="cc-step">' +
          '<button type="button" data-adec="' + a.id + '" aria-label="fewer ' + a.name + '">–</button>' +
          '<input type="number" min="0" step="1" value="0" data-aqty="' + a.id + '" aria-label="quantity ' + a.name + '">' +
          '<button type="button" data-ainc="' + a.id + '" aria-label="more ' + a.name + '">+</button>' +
        '</span></div>';
    }).join("");
  }
  // reflect state + advanced step into inputs/prices
  function syncGrid() {
    ROLLS.forEach(function (r) {
      var inp = document.querySelector('[data-qty="' + r.id + '"]');
      if (inp) { inp.value = pieces[r.id] || 0; inp.step = step(); }
      var pr = document.querySelector('[data-price="' + r.id + '"]');
      if (pr) pr.textContent = advanced
        ? money(perPiece(r)) + " / piece"
        : money(perPiece(r) * 10) + " / 10 pcs";
      var card = document.querySelector('.cater-card[data-roll="' + r.id + '"]');
      if (card) card.classList.toggle("has", !!pieces[r.id]);
    });
    ADDONS.forEach(function (a) {
      var inp = document.querySelector('[data-aqty="' + a.id + '"]');
      if (inp) inp.value = addons[a.id] || 0;
    });
  }

  function renderEstimate() {
    var box = $("cater-estimate"); if (!box) return;
    if (!guests) { box.innerHTML = '<span class="ce-hint">Enter your guest count and we\'ll estimate the food and cost.</span>'; return; }
    var tp = targetPieces(), est = tp * avgPerPiece;
    box.innerHTML =
      '<span class="ce-fig"><b>' + guests + '</b><small>guests</small></span>' +
      '<span class="ce-x">×</span>' +
      '<span class="ce-fig"><b>~' + perGuest + '</b><small>pieces each</small></span>' +
      '<span class="ce-x">=</span>' +
      '<span class="ce-fig ce-hi"><b>~' + tp + '</b><small>pieces</small></span>' +
      '<span class="ce-fig ce-hi"><b>≈ ' + money(est) + '</b><small>estimated</small></span>';
  }

  function renderProgress() {
    var box = $("cater-progress"); if (!box) return;
    var sp = sumPieces(), tp = targetPieces();
    var pct = tp ? Math.min(100, Math.round(sp / tp * 100)) : (sp ? 100 : 0);
    var msg;
    if (!sp) msg = guests ? "Pick your sushi below — or auto-fill a balanced spread." : "Selected: 0 pieces.";
    else if (!tp) msg = "<b>" + sp + "</b> pieces selected.";
    else if (sp < tp) msg = "<b>" + sp + "</b> of ~" + tp + " pieces — about <b>" + (tp - sp) + "</b> more to cover " + guests + " guests.";
    else msg = "<b>" + sp + "</b> pieces — nicely covered for " + guests + " guests. ✓";
    box.innerHTML = '<div class="cp-bar"><i style="width:' + pct + '%"></i></div><div class="cp-msg">' + msg + '</div>';
    box.classList.toggle("is-covered", tp > 0 && sp >= tp);
  }

  function flashEstimate() {
    var box = $("cater-estimate"); if (!box) return;
    box.classList.remove("flash"); void box.offsetWidth; box.classList.add("flash");
  }

  /* ---- totals / receipt ---- */
  function computeCart() {
    var lines = [], subtotal = 0;
    ROLLS.forEach(function (r) {
      var pc = pieces[r.id] || 0; if (!pc) return;
      var pp = perPiece(r), lt = pp * pc; subtotal += lt;
      lines.push({ id: r.id, name: r.name, qty: pc, qtyLabel: pc + " pcs", price: pp, unit: "piece", lineTotal: lt });
    });
    ADDONS.forEach(function (a) {
      var q = addons[a.id] || 0; if (!q) return;
      var lt = a.price * q; subtotal += lt;
      lines.push({ id: a.id, name: a.name, qty: q, qtyLabel: String(q), price: a.price, unit: a.unit, lineTotal: lt });
    });
    var deliveryFee = (getFulfillment() === "delivery") ? window.SITE.deliveryFee : 0;
    return { lines: lines, subtotal: subtotal, deliveryFee: deliveryFee, total: subtotal + deliveryFee, pieces: sumPieces() };
  }

  function recalc() {
    renderEstimate();
    renderProgress();
    var c = computeCart();
    var body = $("cart-lines");
    if (body) {
      body.innerHTML = c.lines.length
        ? c.lines.map(function (l) {
            return '<tr><td>' + l.name + '</td><td>' + money(l.price) + '</td>' +
              '<td>' + l.qtyLabel + '</td><td>' + money(l.lineTotal) + '</td></tr>';
          }).join("")
        : '<tr><td colspan="4">No items yet — pick your sushi above.</td></tr>';
    }
    if ($("cart-subtotal")) $("cart-subtotal").textContent = money(c.subtotal);
    if ($("cart-deliveryfee")) $("cart-deliveryfee").textContent = money(c.deliveryFee);
    if ($("cart-total")) $("cart-total").textContent = money(c.total);
    var warn = $("cart-warning");
    if (warn) {
      if (c.subtotal > 0 && c.subtotal < window.SITE.minOrder) {
        warn.textContent = "Minimum order is " + money(window.SITE.minOrder) + ". Add " + money(window.SITE.minOrder - c.subtotal) + " more to submit.";
        warn.style.display = "";
      } else { warn.textContent = ""; warn.style.display = "none"; }
    }
    return c;
  }

  /* ---- booking form (contract unchanged) ---- */
  function todayStr() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }

  function validate(data, cartData) {
    var errs = [];
    if (!data.name) errs.push("Name is required.");
    if (!data.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) errs.push("A valid email is required.");
    if (!data.phone) errs.push("Phone number is required.");
    if (!data.eventDate) {
      errs.push("Event date is required.");
    } else {
      var ev = new Date(data.eventDate + "T00:00:00"), min = todayStr();
      min.setDate(min.getDate() + window.SITE.leadTimeDays);
      if (ev < todayStr()) errs.push("Event date cannot be in the past.");
      else if (ev < min) errs.push("We need at least " + window.SITE.leadTimeDays + " days' lead time. Please pick a later date.");
    }
    if (!data.guests || data.guests < 1) errs.push("Guest count must be at least 1.");
    else if (data.guests > 2000) errs.push("For 2000+ guests, please call us directly.");
    if (data.fulfillment === "delivery" && !data.address) errs.push("Delivery address is required for delivery orders.");
    if (!cartData.lines.length) errs.push("Please add at least one item to your order.");
    else if (cartData.subtotal < window.SITE.minOrder) errs.push("Order subtotal is below the " + money(window.SITE.minOrder) + " minimum.");
    return errs;
  }

  function bindForm() {
    var form = $("booking-form"); if (!form) return;
    Array.prototype.forEach.call(document.querySelectorAll('input[name="fulfillment"]'), function (r) {
      r.addEventListener("change", function () {
        var row = $("address-row"); if (row) row.style.display = (getFulfillment() === "delivery") ? "" : "none";
        recalc();
      });
    });
    var addrRow = $("address-row");
    if (addrRow) addrRow.style.display = (getFulfillment() === "delivery") ? "" : "none";
    var dateInput = form.querySelector('[name="eventDate"]');
    if (dateInput) { var min = todayStr(); min.setDate(min.getDate() + window.SITE.leadTimeDays); dateInput.min = min.toISOString().slice(0, 10); }
    // keep the two guest inputs in step
    var fg = $("f-guests");
    if (fg) fg.addEventListener("input", function () { var v = Number(fg.value) || 0; if (v) { guests = v; var gc = $("guest-count"); if (gc) gc.value = v; recalc(); } });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var data = {
        name: (fd.get("name") || "").trim(), email: (fd.get("email") || "").trim(), phone: (fd.get("phone") || "").trim(),
        eventDate: fd.get("eventDate") || "", guests: Number(fd.get("guests")) || guests || 0,
        fulfillment: getFulfillment(), address: (fd.get("address") || "").trim(), notes: (fd.get("notes") || "").trim()
      };
      var cartData = computeCart();
      var errs = validate(data, cartData);
      var errBox = $("form-errors");
      if (errs.length) {
        if (errBox) {
          errBox.innerHTML = "<strong>Please fix the following:</strong><ul>" + errs.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
          errBox.style.display = ""; errBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
      if (errBox) { errBox.innerHTML = ""; errBox.style.display = "none"; }
      var record = window.Store.addRequest({
        eventDate: data.eventDate, guests: data.guests, fulfillment: data.fulfillment, address: data.address,
        name: data.name, email: data.email, phone: data.phone, notes: data.notes,
        items: cartData.lines, subtotal: cartData.subtotal, deliveryFee: cartData.deliveryFee, total: cartData.total
      });
      var confirm = $("booking-confirm");
      if (confirm) {
        confirm.innerHTML = "<h3>Thank you, " + escapeHtml(data.name) + "!</h3>" +
          "<p>Your quote request (<code>" + record.id + "</code>) is in for " + escapeHtml(data.eventDate) + ", " + data.guests + " guests — " +
          cartData.pieces + " pieces of sushi.</p>" +
          "<p>Estimated total: <strong>" + money(cartData.total) + "</strong> (" + data.fulfillment + "). We'll confirm within one business day at " + escapeHtml(data.email) + ".</p>";
        confirm.style.display = ""; confirm.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      pieces = {}; addons = {}; form.reset(); syncGrid(); recalc();
      var row = $("address-row"); if (row) row.style.display = (getFulfillment() === "delivery") ? "" : "none";
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; });
  }

  /* ---- events ---- */
  function bindBuilder() {
    var gc = $("guest-count");
    if (gc) gc.addEventListener("input", function () { setGuests(gc.value); });
    var ap = $("appetite");
    if (ap) ap.addEventListener("click", function (e) {
      var b = e.target.closest(".apbtn"); if (b) setAppetite(Number(b.getAttribute("data-per")));
    });
    var af = $("cater-autofill");
    if (af) af.addEventListener("click", autofill);
    var adv = $("adv-toggle");
    if (adv) adv.addEventListener("change", function () { advanced = adv.checked; syncGrid(); renderProgress(); });

    var grid = $("cater-grid");
    if (grid) {
      grid.addEventListener("click", function (e) {
        var inc = e.target.getAttribute("data-inc"), dec = e.target.getAttribute("data-dec");
        if (inc) stepPieces(inc, 1); if (dec) stepPieces(dec, -1);
      });
      grid.addEventListener("input", function (e) {
        var id = e.target.getAttribute("data-qty"); if (id) setPieces(id, e.target.value);
      });
    }
    var addWrap = $("cater-addons");
    if (addWrap) {
      addWrap.addEventListener("click", function (e) {
        var inc = e.target.getAttribute("data-ainc"), dec = e.target.getAttribute("data-adec");
        if (inc) stepAddon(inc, 1); if (dec) stepAddon(dec, -1);
      });
      addWrap.addEventListener("input", function (e) {
        var id = e.target.getAttribute("data-aqty"); if (id) setAddon(id, e.target.value);
      });
    }
  }

  function init() {
    var menu = window.getMenu ? window.getMenu() : (window.MENU || {});
    ROLLS = menu.rolls || []; ADDONS = menu.addons || [];
    avgPerPiece = ROLLS.length ? ROLLS.reduce(function (s, r) { return s + perPiece(r); }, 0) / ROLLS.length : 1.25;
    renderGrid(); renderAddons(); bindBuilder(); bindForm();
    var gc = $("guest-count"); if (gc && gc.value) guests = Number(gc.value) || 0;
    syncGrid(); recalc();
  }

  document.addEventListener("DOMContentLoaded", init);
  return { recalc: recalc, getOrder: function () { return { guests: guests, perGuest: perGuest, pieces: Object.assign({}, pieces), addons: Object.assign({}, addons) }; } };
})();
