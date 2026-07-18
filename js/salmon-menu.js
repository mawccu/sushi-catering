/* ============================================================================
 * Salmon menu selector (js/salmon-menu.js)
 * ----------------------------------------------------------------------------
 * The skeleton IS the menu navigation. A whole salmon is divided head->tail
 * into four cuts, each mapped to a real menu category:
 *
 *   カマ Collar -> packages   背 Loin -> platters
 *   腹 Belly    -> rolls       尾 Tail -> addons
 *
 * Hovering a cut lifts its flesh to bare the bones (the "picking" gesture).
 * Clicking a cut (or its legend button) filters #menu-display to that category
 * and scrolls it into view. Clicking the active cut again — or "Whole fish" —
 * restores the full menu.
 *
 * RESILIENCE / a11y:
 *  - The <button> legend is the real, keyboard-accessible control; the SVG is a
 *    pointer/visual enhancement (aria-hidden). Hover + click drive the same fns.
 *  - If this script never runs, #menu-display still renders every category in
 *    full (menu-display.js is independent). Nothing here is required to see the
 *    menu — it only adds a way to filter it.
 * ==========================================================================*/
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  var CUTS = [
    { cat: "packages", jp: "カマ", name: "Collar", label: "Catering Packages", x0: 62, x1: 305 },
    { cat: "platters", jp: "背",  name: "Loin",   label: "Party Trays & Platters", x0: 305, x1: 560 },
    { cat: "rolls",    jp: "腹",  name: "Belly",  label: "À La Carte Rolls", x0: 560, x1: 782 },
    { cat: "addons",   jp: "尾",  name: "Tail",   label: "Sides & Add-Ons", x0: 782, x1: 960 }
  ];

  var BODY = "M62,235 C120,152 250,112 420,110 C590,108 726,146 812,204 L826,214 " +
    "C860,196 900,160 928,138 C918,180 906,214 892,236 C906,258 918,292 928,334 " +
    "C900,312 860,276 826,258 L812,268 C726,326 590,364 420,362 C250,360 120,318 62,235 Z";

  var seed = 314159;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  function halfH(x) { var t = (x - 437) / 380; return Math.max(16, 118 * Math.sqrt(Math.max(0, 1 - t * t))); }

  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  var active = null;               // current category or null (whole fish)
  var fleshByCat = {};             // cat -> flesh <rect>
  var regionByCat = {};            // cat -> region <g>
  var btnByCat = {};               // cat -> legend <button>

  function liftFlesh(cat, on) {
    var f = fleshByCat[cat];
    if (f) f.classList.toggle("lift", on);
    var r = regionByCat[cat];
    if (r) r.classList.toggle("hot", on);
  }

  function applyFilter(cat) {
    var host = document.getElementById("menu-display");
    if (!host) return;
    Array.prototype.forEach.call(host.querySelectorAll(".menu-cat"), function (s) {
      s.hidden = !!cat && s.getAttribute("data-cat") !== cat;
    });
  }

  function scrollToMenu() {
    var target = document.getElementById("menu-display");
    if (!target) return;
    if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(target, { offset: -80 });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  function select(cat) {
    var next = (cat === active) ? null : cat;
    active = next;

    CUTS.forEach(function (c) {
      var on = (c.cat === active);
      liftFlesh(c.cat, on);
      if (btnByCat[c.cat]) btnByCat[c.cat].setAttribute("aria-pressed", String(on));
    });

    var wrap = document.getElementById("salmon-menu");
    if (wrap) wrap.classList.toggle("is-filtered", !!active);
    var reset = document.getElementById("sm-reset");
    if (reset) reset.hidden = !active;

    applyFilter(active);
    if (active) scrollToMenu();
  }

  /* ------------------------------------------------------------------ */
  function buildSVG() {
    var host = document.getElementById("sm-canvas");
    if (!host) return;
    host.setAttribute("aria-hidden", "true");

    var svg = el("svg", {
      viewBox: "0 0 1000 400", xmlns: SVGNS, "class": "sm-svg"
    }, host);

    var defs = el("defs", {}, svg);
    var grad = el("linearGradient", { id: "smFlesh", x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
    el("stop", { offset: "0", "stop-color": "#E58363" }, grad);
    el("stop", { offset: ".55", "stop-color": "#C4522F" }, grad);
    el("stop", { offset: "1", "stop-color": "#9A3E22" }, grad);
    var clip = el("clipPath", { id: "smBodyClip" }, defs);
    el("path", { d: BODY }, clip);

    // (1) bones under the flesh — revealed when a cut is picked
    var bones = el("g", { "class": "sm-bones", "clip-path": "url(#smBodyClip)" }, svg);
    el("path", { d: "M252,228 L812,228 M252,240 L812,240" }, bones);       // spine rails
    for (var x = 258; x <= 806; x += 15) {
      el("line", { x1: x, y1: 226, x2: x, y2: 242 }, bones);                // vertebrae
      var hh = halfH(x), j = (rnd() - 0.5) * 6;
      if (x < 792) el("line", { x1: x, y1: 226, x2: x + 16, y2: (236 - hh * 0.78 + j).toFixed(1), "class": "thin" }, bones);
      if (x < 560) el("path", { d: "M" + x + ",242 q" + (10 + j).toFixed(1) + "," + (hh * 0.45).toFixed(1) + " -6," + (hh * 0.82).toFixed(1), "class": "thin" }, bones);
      else if (x < 792) el("line", { x1: x, y1: 242, x2: x + 14, y2: (236 + hh * 0.72 + j).toFixed(1), "class": "thin" }, bones);
    }
    // skull + tail rays
    el("circle", { cx: 152, cy: 200, r: 15 }, bones);
    el("path", { d: "M70,232 C96,180 150,158 206,160 M70,240 C110,262 160,262 200,250", "class": "thin" }, bones);
    [[918,150],[926,172],[920,196],[908,220],[908,252],[920,276],[926,300]].forEach(function (t) {
      el("line", { x1: 824, y1: 236, x2: t[0], y2: t[1], "class": "thin" }, bones);
    });

    // (2) per-cut flesh panels (cover the bones; lift to reveal)
    CUTS.forEach(function (c) {
      var g = el("g", { "clip-path": "url(#smBodyClip)" }, svg);
      var f = el("rect", {
        x: c.x0, y: 90, width: (c.x1 - c.x0), height: 290,
        fill: "url(#smFlesh)", "class": "sm-flesh"
      }, g);
      fleshByCat[c.cat] = f;
    });

    // (3) fish outline + fin hints
    el("path", { d: BODY, "class": "sm-outline" }, svg);
    el("circle", { cx: 152, cy: 200, r: 8, "class": "sm-eye" }, svg);

    // (4) cut dividers + hit regions + tick labels
    CUTS.forEach(function (c, i) {
      if (i > 0) el("line", { x1: c.x0, y1: 96, x2: c.x0, y2: 376, "class": "sm-div", "clip-path": "url(#smBodyClip)" }, svg);
      var g = el("g", { "class": "sm-region", "data-cat": c.cat }, svg);
      var mid = (c.x0 + c.x1) / 2;
      el("text", { x: mid, y: 70, "text-anchor": "middle", "class": "sm-jp" }, g).textContent = c.jp;
      el("text", { x: mid, y: 392, "text-anchor": "middle", "class": "sm-cutname" }, g).textContent = c.name.toUpperCase();
      var hit = el("rect", {
        x: c.x0, y: 96, width: (c.x1 - c.x0), height: 280,
        "class": "sm-hit", "clip-path": "url(#smBodyClip)"
      }, g);
      regionByCat[c.cat] = g;
      hit.addEventListener("mouseenter", function () { if (c.cat !== active) liftFlesh(c.cat, true); });
      hit.addEventListener("mouseleave", function () { if (c.cat !== active) liftFlesh(c.cat, false); });
      hit.addEventListener("click", function () { select(c.cat); });
    });
  }

  function buildLegend() {
    var host = document.getElementById("sm-legend");
    if (!host) return;
    var menu = (typeof window.getMenu === "function") ? window.getMenu() : (window.MENU || {});
    CUTS.forEach(function (c) {
      var n = (menu[c.cat] || []).length;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sm-cut-btn";
      b.setAttribute("data-cat", c.cat);
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = '<span class="sm-btn-jp" aria-hidden="true">' + c.jp + '</span>' +
        '<span class="sm-btn-name">' + c.label + '</span>' +
        '<span class="sm-btn-count mono">' + n + (n === 1 ? " item" : " items") + '</span>';
      b.addEventListener("mouseenter", function () { if (c.cat !== active) liftFlesh(c.cat, true); });
      b.addEventListener("mouseleave", function () { if (c.cat !== active) liftFlesh(c.cat, false); });
      b.addEventListener("focus", function () { if (c.cat !== active) liftFlesh(c.cat, true); });
      b.addEventListener("blur", function () { if (c.cat !== active) liftFlesh(c.cat, false); });
      b.addEventListener("click", function () { select(c.cat); });
      btnByCat[c.cat] = b;
      host.appendChild(b);
    });
    var reset = document.createElement("button");
    reset.type = "button";
    reset.id = "sm-reset";
    reset.className = "sm-reset mono";
    reset.hidden = true;
    reset.textContent = "↩ Whole fish — show everything";
    reset.addEventListener("click", function () { select(active); });
    host.appendChild(reset);
  }

  function init() {
    if (!document.getElementById("salmon-menu")) return;
    // menu-display renders on DOMContentLoaded too; build after it so counts/filter work.
    buildSVG();
    buildLegend();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
