/* ============================================================================
 * Quote Builder + Booking Form controller (js/builder.js)
 * ----------------------------------------------------------------------------
 * Powers index.html #builder and #booking sections.
 *
 * CART STATE: an in-memory map { [itemId]: qty }. Not persisted until the
 * booking form is submitted (which snapshots it into a Request via Store).
 *
 * KEY DOM IDS this script expects in index.html (keep stable for polish pass):
 *   #builder-list           container where item rows render
 *   #guest-count            <input type=number> guest count for recommender
 *   #recommend-out          where platter recommendation text renders
 *   #btn-recommend          triggers recommendation -> adds suggested to cart
 *   #cart-lines             tbody for cart line items
 *   #cart-subtotal          subtotal cell
 *   #cart-deliveryfee       delivery fee cell
 *   #cart-total             grand total cell
 *   #cart-warning           min-order warning text
 *   #booking-form           the <form>
 *   fields: name,email,phone,eventDate,guests,fulfillment(radio),address,notes
 *   #address-row            wrapper toggled by fulfillment
 *   #booking-confirm        confirmation panel (shown after submit)
 *   #form-errors            validation error list
 *
 * PUBLIC (window): Builder.recalc(), Builder.getCart()
 * ==========================================================================*/

window.Builder = (function () {
  var cart = {};   // { itemId: qty }

  function $(id) { return document.getElementById(id); }

  function getFulfillment() {
    var r = document.querySelector('input[name="fulfillment"]:checked');
    return r ? r.value : "pickup";
  }

  /* ---- Cart mutation ---- */
  function setQty(id, qty) {
    qty = Math.max(0, Math.floor(Number(qty) || 0));
    if (qty === 0) delete cart[id];
    else cart[id] = qty;
    syncInputs();
    recalc();
  }
  function addQty(id, delta) {
    setQty(id, (cart[id] || 0) + delta);
  }

  // Reflect cart qty back into the builder-list number inputs.
  function syncInputs() {
    window.getMenuFlat().forEach(function (it) {
      var inp = document.querySelector('[data-qty="' + it.id + '"]');
      if (inp) inp.value = cart[it.id] || 0;
    });
  }

  /* ---- Rendering the selectable menu ---- */
  function renderBuilder() {
    var host = $("builder-list");
    if (!host) return;
    var menu = window.getMenu();
    var cats = [
      ["packages", "Packages (priced per person)"],
      ["platters", "Party Trays & Platters"],
      ["rolls", "A La Carte Rolls"],
      ["addons", "Add-Ons"]
    ];
    var html = "";
    cats.forEach(function (c) {
      var key = c[0], label = c[1];
      html += '<div class="builder-cat"><h3>' + label + '</h3>';
      menu[key].forEach(function (it) {
        html += '<div class="builder-item" data-item="' + it.id + '">' +
          '<span class="bi-name">' + it.name + '</span> ' +
          '<span class="bi-price">' + window.formatMoney(it.price) + ' / ' + it.unit + '</span> ' +
          '<span class="bi-desc">' + it.desc + '</span> ' +
          '<span class="bi-controls">' +
            '<button type="button" data-dec="' + it.id + '" aria-label="decrease ' + it.name + '">–</button>' +
            '<input type="number" min="0" step="1" value="0" data-qty="' + it.id + '" aria-label="quantity ' + it.name + '">' +
            '<button type="button" data-inc="' + it.id + '" aria-label="increase ' + it.name + '">+</button>' +
          '</span>' +
        '</div>';
      });
      html += '</div>';
    });
    host.innerHTML = html;

    host.addEventListener("click", function (e) {
      var inc = e.target.getAttribute("data-inc");
      var dec = e.target.getAttribute("data-dec");
      if (inc) addQty(inc, 1);
      if (dec) addQty(dec, -1);
    });
    host.addEventListener("input", function (e) {
      var id = e.target.getAttribute("data-qty");
      if (id) setQty(id, e.target.value);
    });
  }

  /* ---- Recommendation ---- */
  function doRecommend() {
    var g = Number($("guest-count") ? $("guest-count").value : 0) || 0;
    var out = $("recommend-out");
    if (g < 1) { if (out) out.textContent = "Enter a guest count of 1 or more."; return; }
    var recs = window.recommendPlatters(g);
    if (!recs.length) { if (out) out.textContent = "No recommendation available."; return; }
    recs.forEach(function (r) { setQty(r.item.id, r.qty); });
    var parts = recs.map(function (r) { return r.qty + " × " + r.item.name; });
    if (out) out.textContent = "For " + g + " guests we suggest: " + parts.join(", ") +
      ". Added to your quote below — adjust as you like.";
  }

  /* ---- Totals ---- */
  function computeCart() {
    var lines = [];
    var subtotal = 0;
    window.getMenuFlat().forEach(function (it) {
      var qty = cart[it.id];
      if (!qty) return;
      var lineTotal = it.price * qty;
      subtotal += lineTotal;
      lines.push({ id: it.id, name: it.name, qty: qty, price: it.price, unit: it.unit, lineTotal: lineTotal });
    });
    var deliveryFee = (getFulfillment() === "delivery") ? window.SITE.deliveryFee : 0;
    return { lines: lines, subtotal: subtotal, deliveryFee: deliveryFee, total: subtotal + deliveryFee };
  }

  function recalc() {
    var c = computeCart();
    var body = $("cart-lines");
    if (body) {
      if (!c.lines.length) {
        body.innerHTML = '<tr><td colspan="4">No items selected yet.</td></tr>';
      } else {
        body.innerHTML = c.lines.map(function (l) {
          return '<tr><td>' + l.name + '</td><td>' + window.formatMoney(l.price) + '</td>' +
            '<td>' + l.qty + '</td><td>' + window.formatMoney(l.lineTotal) + '</td></tr>';
        }).join("");
      }
    }
    if ($("cart-subtotal")) $("cart-subtotal").textContent = window.formatMoney(c.subtotal);
    if ($("cart-deliveryfee")) $("cart-deliveryfee").textContent = window.formatMoney(c.deliveryFee);
    if ($("cart-total")) $("cart-total").textContent = window.formatMoney(c.total);
    var warn = $("cart-warning");
    if (warn) {
      if (c.subtotal > 0 && c.subtotal < window.SITE.minOrder) {
        warn.textContent = "Minimum order is " + window.formatMoney(window.SITE.minOrder) +
          ". Add " + window.formatMoney(window.SITE.minOrder - c.subtotal) + " more to submit a quote.";
        warn.style.display = "";
      } else {
        warn.textContent = "";
        warn.style.display = "none";
      }
    }
    return c;
  }

  /* ---- Booking form ---- */
  function todayStr() {
    var d = new Date(); d.setHours(0,0,0,0);
    return d;
  }

  function validate(data, cartData) {
    var errs = [];
    if (!data.name) errs.push("Name is required.");
    if (!data.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) errs.push("A valid email is required.");
    if (!data.phone) errs.push("Phone number is required.");
    if (!data.eventDate) {
      errs.push("Event date is required.");
    } else {
      var ev = new Date(data.eventDate + "T00:00:00");
      var min = todayStr();
      min.setDate(min.getDate() + window.SITE.leadTimeDays);
      if (ev < todayStr()) errs.push("Event date cannot be in the past.");
      else if (ev < min) errs.push("We need at least " + window.SITE.leadTimeDays + " days' lead time. Please pick a later date.");
    }
    if (!data.guests || data.guests < 1) errs.push("Guest count must be at least 1.");
    else if (data.guests > 2000) errs.push("For 2000+ guests, please call us directly.");
    if (data.fulfillment === "delivery" && !data.address) errs.push("Delivery address is required for delivery orders.");
    if (!cartData.lines.length) errs.push("Please add at least one item to your quote.");
    else if (cartData.subtotal < window.SITE.minOrder) errs.push("Order subtotal is below the " + window.formatMoney(window.SITE.minOrder) + " minimum.");
    return errs;
  }

  function bindForm() {
    var form = $("booking-form");
    if (!form) return;

    // Toggle address field based on fulfillment.
    Array.prototype.forEach.call(document.querySelectorAll('input[name="fulfillment"]'), function (r) {
      r.addEventListener("change", function () {
        var row = $("address-row");
        if (row) row.style.display = (getFulfillment() === "delivery") ? "" : "none";
        recalc();
      });
    });
    var addrRow = $("address-row");
    if (addrRow) addrRow.style.display = (getFulfillment() === "delivery") ? "" : "none";

    // Set min date on date input to lead-time date.
    var dateInput = form.querySelector('[name="eventDate"]');
    if (dateInput) {
      var min = todayStr(); min.setDate(min.getDate() + window.SITE.leadTimeDays);
      dateInput.min = min.toISOString().slice(0, 10);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var data = {
        name: (fd.get("name") || "").trim(),
        email: (fd.get("email") || "").trim(),
        phone: (fd.get("phone") || "").trim(),
        eventDate: fd.get("eventDate") || "",
        guests: Number(fd.get("guests")) || 0,
        fulfillment: getFulfillment(),
        address: (fd.get("address") || "").trim(),
        notes: (fd.get("notes") || "").trim()
      };
      var cartData = computeCart();
      var errs = validate(data, cartData);
      var errBox = $("form-errors");
      if (errs.length) {
        if (errBox) {
          errBox.innerHTML = "<strong>Please fix the following:</strong><ul>" +
            errs.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
          errBox.style.display = "";
          errBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
      if (errBox) { errBox.innerHTML = ""; errBox.style.display = "none"; }

      var record = window.Store.addRequest({
        eventDate: data.eventDate, guests: data.guests, fulfillment: data.fulfillment,
        address: data.address, name: data.name, email: data.email, phone: data.phone,
        notes: data.notes, items: cartData.lines, subtotal: cartData.subtotal,
        deliveryFee: cartData.deliveryFee, total: cartData.total
      });

      var confirm = $("booking-confirm");
      if (confirm) {
        confirm.innerHTML = "<h3>Thank you, " + escapeHtml(data.name) + "!</h3>" +
          "<p>Your quote request (<code>" + record.id + "</code>) has been received for " +
          escapeHtml(data.eventDate) + ", " + data.guests + " guests.</p>" +
          "<p>Estimated total: <strong>" + window.formatMoney(cartData.total) + "</strong> " +
          "(" + data.fulfillment + "). We'll confirm availability within one business day at " +
          escapeHtml(data.email) + ".</p>";
        confirm.style.display = "";
        confirm.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Reset cart + form so a fresh request can be made.
      cart = {};
      form.reset();
      syncInputs();
      recalc();
      var row = $("address-row");
      if (row) row.style.display = (getFulfillment() === "delivery") ? "" : "none";
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function init() {
    renderBuilder();
    var rec = $("btn-recommend");
    if (rec) rec.addEventListener("click", doRecommend);
    bindForm();
    recalc();
  }

  document.addEventListener("DOMContentLoaded", init);

  return { recalc: recalc, getCart: function () { return Object.assign({}, cart); } };
})();
