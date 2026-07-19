/* ============================================================================
 * Menu display renderer (js/menu-display.js), editorial price-list edition
 * ----------------------------------------------------------------------------
 * Renders the read-only menu into #menu-display (index.html #menu section) as
 * a fine-dining price list, grouped by category, prices from getMenu()
 * (reflects admin overrides).
 * ==========================================================================*/
(function () {
  function tags(t) {
    if (!t || !t.length) return "";
    return '<span class="mr-tags">' + t.map(function (x) {
      return '<span class="tag">' + x + '</span>';
    }).join("") + '</span>';
  }
  function init() {
    var host = document.getElementById("menu-display");
    if (!host) return;
    var m = window.getMenu();
    var cats = [
      ["packages", "Catering Packages", "包", "Priced per guest, chef-composed, plated, and labeled. We handle the rest."],
      ["platters", "Party Trays & Platters", "盛", "Ready-to-serve centrepieces that feed a crowd."],
      ["rolls", "A La Carte Rolls", "巻", "Build your own spread, roll by roll. Eight pieces each."],
      ["addons", "Sides & Add-Ons", "副", "Round out the feast, start to sweet finish."]
    ];
    host.innerHTML = cats.map(function (c, i) {
      var key = c[0];
      return '<section class="menu-cat" id="menucat-' + key + '" data-cat="' + key + '">' +
        '<header class="menu-cat-head" data-reveal>' +
          '<div>' +
            '<span class="cat-index mono">(0' + (i + 1) + ') · ' + c[2] + '</span>' +
            '<h3 class="cat-title">' + c[1] + '</h3>' +
          '</div>' +
          '<p class="cat-note">' + c[3] + '</p>' +
        '</header>' +
        '<ul class="menu-list" data-reveal-stagger>' + m[key].map(function (it) {
          var meta = it.pieces
            ? it.pieces + " pcs · serves ~" + it.serves
            : (it.unit !== "per person" ? "serves ~" + it.serves : "per guest");
          return '<li class="menu-row">' +
            '<div class="mr-main">' +
              '<span class="mr-name">' + it.name + '</span>' +
              tags(it.tags) +
              '<span class="mr-leader" aria-hidden="true"></span>' +
              '<span class="mr-price">' + window.formatMoney(it.price) +
                (it.unit === "per person" ? " / person" : "") + '</span>' +
            '</div>' +
            '<div class="mr-sub">' +
              '<p class="mr-desc">' + it.desc + '</p>' +
              '<p class="mr-meta">' + meta + '</p>' +
            '</div>' +
          '</li>';
        }).join("") + '</ul>' +
      '</section>';
    }).join("");
  }
  document.addEventListener("DOMContentLoaded", init);
})();
