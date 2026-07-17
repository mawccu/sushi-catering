/* ============================================================================
 * Menu display renderer (js/menu-display.js)
 * ----------------------------------------------------------------------------
 * Renders the read-only menu into #menu-display (index.html #menu section),
 * grouped by category with prices from getMenu() (reflects admin overrides).
 * ==========================================================================*/
(function () {
  function tags(t) {
    return (t || []).map(function (x) { return '<span class="tag">' + x + '</span>'; }).join(" ");
  }
  function init() {
    var host = document.getElementById("menu-display");
    if (!host) return;
    var m = window.getMenu();
    var cats = [
      ["packages", "Catering Packages", "Priced per guest — we handle the rest."],
      ["platters", "Party Trays & Platters", "Ready-to-serve, feeds a crowd."],
      ["rolls", "A La Carte Rolls", "Build your own spread, roll by roll."],
      ["addons", "Sides & Add-Ons", "Round out the feast."]
    ];
    host.innerHTML = cats.map(function (c) {
      var key = c[0];
      return '<section class="menu-cat"><h3>' + c[1] + '</h3><p class="menu-cat-note">' + c[2] + '</p>' +
        '<div class="menu-grid">' + m[key].map(function (it) {
          return '<div class="menu-card">' +
            '<div class="mc-head"><span class="mc-name">' + it.name + '</span>' +
            '<span class="mc-price">' + window.formatMoney(it.price) +
            (it.unit === "per person" ? " / person" : "") + '</span></div>' +
            '<p class="mc-desc">' + it.desc + '</p>' +
            (it.pieces ? '<p class="mc-meta">' + it.pieces + ' pieces · serves ~' + it.serves + '</p>'
                       : (it.unit !== "per person" ? '<p class="mc-meta">serves ~' + it.serves + '</p>' : '')) +
            '<p class="mc-tags">' + tags(it.tags) + '</p>' +
          '</div>';
        }).join("") + '</div></section>';
    }).join("");
  }
  document.addEventListener("DOMContentLoaded", init);
})();
