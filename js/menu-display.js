/* ============================================================================
 * Menu display renderer (js/menu-display.js) — "printed menu card" edition
 * ----------------------------------------------------------------------------
 * Renders the read-only menu into #menu-display (index.html #menu section) as
 * an actual restaurant menu: a bordered menu card, category sections with a
 * heading + kanji seal, item rows with a name, dietary badges, a dotted leader
 * and a clear price, and a plain-language description. Prices come from
 * getMenu() so admin overrides are reflected.
 * ==========================================================================*/
(function () {
  // Only dietary flags that help a guest decide. "cooked" is not a badge.
  var BADGES = {
    vegetarian:    { label: "Veg",  cls: "b-veg" },
    vegan:         { label: "Vegan", cls: "b-vgn" },
    "gluten-free": { label: "GF",   cls: "b-gf" },
    raw:           { label: "Raw",  cls: "b-raw" }
  };

  function badges(t) {
    if (!t || !t.length) return "";
    var out = t.filter(function (x) { return BADGES[x]; }).map(function (x) {
      return '<span class="mi-badge ' + BADGES[x].cls + '">' + BADGES[x].label + '</span>';
    }).join("");
    return out ? '<span class="mi-badges">' + out + '</span>' : "";
  }

  function meta(it) {
    if (it.pieces) return it.pieces + " pieces · serves ~" + it.serves;
    if (it.unit !== "per person") return "serves ~" + it.serves;
    return "";
  }

  function price(it) {
    var p = window.formatMoney(it.price).replace("JD ", "JD ");
    return it.unit === "per person"
      ? '<span class="mi-price">' + p + '<small> / guest</small></span>'
      : '<span class="mi-price">' + p + '</span>';
  }

  function init() {
    var host = document.getElementById("menu-display");
    if (!host) return;
    var m = window.getMenu();

    var cats = [
      ["packages", "Catering Packages", "包", "Priced per guest. We compose, plate, and label everything."],
      ["platters", "Party Trays &amp; Platters", "盛", "Ready-to-serve centrepieces for a crowd."],
      ["rolls",    "Rolls, à la carte",       "巻", "Build your own spread. Eight pieces per roll."],
      ["addons",   "Sides &amp; Extras",       "副", "Round out the table."]
    ];

    var groups = cats.map(function (c) {
      var key = c[0];
      var rows = m[key].map(function (it) {
        var mt = meta(it);
        return '<li class="menu-item">' +
          '<div class="mi-head">' +
            '<span class="mi-name">' + it.name + badges(it.tags) + '</span>' +
            '<span class="mi-lead" aria-hidden="true"></span>' +
            price(it) +
          '</div>' +
          '<div class="mi-sub">' +
            '<p class="mi-desc">' + it.desc + '</p>' +
            (mt ? '<span class="mi-meta mono">' + mt + '</span>' : '') +
          '</div>' +
        '</li>';
      }).join("");

      return '<section class="menu-group" data-cat="' + key + '" data-reveal>' +
        '<div class="menu-group-head">' +
          '<h4 class="menu-group-title">' + c[1] + '</h4>' +
          '<span class="menu-group-seal" aria-hidden="true">' + c[2] + '</span>' +
        '</div>' +
        '<p class="menu-group-note">' + c[3] + '</p>' +
        '<ul class="menu-items">' + rows + '</ul>' +
      '</section>';
    }).join("");

    host.innerHTML =
      '<div class="menu-card">' +
        '<div class="menu-card-head" data-reveal>' +
          '<span class="menu-card-eyebrow mono">お品書き · The Menu</span>' +
          '<p class="menu-card-note">Hand-rolled the morning of your event. Prices in JOD.</p>' +
          '<ul class="menu-legend">' +
            '<li><span class="mi-badge b-veg">Veg</span> Vegetarian</li>' +
            '<li><span class="mi-badge b-vgn">Vegan</span> Vegan</li>' +
            '<li><span class="mi-badge b-gf">GF</span> Gluten-free</li>' +
            '<li><span class="mi-badge b-raw">Raw</span> Raw fish</li>' +
          '</ul>' +
        '</div>' +
        groups +
      '</div>';
  }
  document.addEventListener("DOMContentLoaded", init);
})();
