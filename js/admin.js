/* ============================================================================
 * Admin controller (js/admin.js), powers admin.html
 * ----------------------------------------------------------------------------
 * Two panels:
 *  1) Requests list, reverse-chronological Store.getRequests(); shows detail
 *     + total; toggle status new<->confirmed; delete.
 *  2) Price editor, edit any menu item's price; persists to
 *     Store.setPriceOverride(id, price); reset restores config.js defaults.
 *
 * DOM IDS expected in admin.html:
 *   #requests-list   container for request cards
 *   #requests-empty  shown when none
 *   #price-editor    container for price rows
 *   #btn-reset-prices  restore all default prices
 * ==========================================================================*/
(function () {
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  /* ---- Requests ---- */
  function renderRequests() {
    var host = $("requests-list");
    var empty = $("requests-empty");
    if (!host) return;
    var reqs = window.Store.getRequests().slice().sort(function (a, b) {
      return b.createdAt - a.createdAt; // reverse chronological
    });
    if (!reqs.length) {
      host.innerHTML = "";
      if (empty) empty.style.display = "";
      return;
    }
    if (empty) empty.style.display = "none";
    host.innerHTML = reqs.map(function (r) {
      var items = (r.items || []).map(function (l) {
        return "<li>" + l.qty + " × " + esc(l.name) + " @ " + window.formatMoney(l.price) +
          " = " + window.formatMoney(l.lineTotal) + "</li>";
      }).join("");
      var when = new Date(r.createdAt).toLocaleString();
      return '<article class="req-card" data-status="' + r.status + '">' +
        '<h3>' + esc(r.name) + ' · ' + window.formatMoney(r.total) +
        ' <span class="req-status">' + r.status + '</span></h3>' +
        '<p class="req-meta"><code>' + r.id + '</code> · submitted ' + esc(when) + '</p>' +
        '<p>Event: <strong>' + esc(r.eventDate) + '</strong> · ' + r.guests + ' guests' +
          (r.address ? ' · venue: ' + esc(r.address) : '') + '</p>' +
        '<p>Contact: ' + esc(r.email) + ' · ' + esc(r.phone) + '</p>' +
        (r.notes ? '<p>Notes: ' + esc(r.notes) + '</p>' : '') +
        '<ul>' + items + '</ul>' +
        '<p>Total <strong>' + window.formatMoney(r.total) + '</strong></p>' +
        '<button type="button" data-toggle="' + r.id + '">' +
          (r.status === "confirmed" ? "Mark as new" : "Mark confirmed") + '</button> ' +
        '<button type="button" data-del="' + r.id + '">Delete</button>' +
      '</article>';
    }).join("");
  }

  function bindRequests() {
    var host = $("requests-list");
    if (!host) return;
    host.addEventListener("click", function (e) {
      var toggle = e.target.getAttribute("data-toggle");
      var del = e.target.getAttribute("data-del");
      if (toggle) {
        var reqs = window.Store.getRequests();
        var cur = reqs.filter(function (x) { return x.id === toggle; })[0];
        if (cur) {
          window.Store.updateRequestStatus(toggle, cur.status === "confirmed" ? "new" : "confirmed");
          renderRequests();
        }
      }
      if (del) {
        if (window.confirm("Delete this request?")) {
          window.Store.deleteRequest(del);
          renderRequests();
        }
      }
    });
  }

  /* ---- Price editor ---- */
  function renderPrices() {
    var host = $("price-editor");
    if (!host) return;
    var overrides = window.Store.getPriceOverrides();
    // Iterate over raw config prices so we can show default vs current.
    host.innerHTML = window.MENU_FLAT.map(function (it) {
      var current = overrides[it.id] !== undefined ? overrides[it.id] : it.price;
      var overridden = overrides[it.id] !== undefined;
      return '<div class="price-row">' +
        '<label>' + esc(it.name) + ' <small>(' + esc(it.category) + ', ' + esc(it.unit) +
          ', default ' + window.formatMoney(it.price) + ')</small></label> ' +
        '<input type="number" min="0" step="0.5" value="' + current + '" data-price="' + it.id + '"> ' +
        (overridden ? '<span class="price-flag">overridden</span>' : '') +
      '</div>';
    }).join("");
  }

  function bindPrices() {
    var host = $("price-editor");
    if (!host) return;
    host.addEventListener("change", function (e) {
      var id = e.target.getAttribute("data-price");
      if (!id) return;
      var v = parseFloat(e.target.value);
      if (isNaN(v) || v < 0) { e.target.value = (window.getItem(id) || {}).price; return; }
      window.Store.setPriceOverride(id, v);
      renderPrices();
    });
    var reset = $("btn-reset-prices");
    if (reset) reset.addEventListener("click", function () {
      if (window.confirm("Restore all default prices?")) {
        window.Store.clearPriceOverrides();
        renderPrices();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderRequests(); bindRequests();
    renderPrices(); bindPrices();
  });
})();
