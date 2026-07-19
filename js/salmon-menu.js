/* ============================================================================
 * Salmon skeleton menu selector (js/salmon-menu.js)
 * ----------------------------------------------------------------------------
 * The fish IS the menu. When the section scrolls into view the salmon is
 * "skinned" — its flesh splits into two fillets that peel apart — revealing the
 * skeleton. Four bones then pop up from the spine, one per menu category, each
 * labelled (kanji on the knob, category name written up the shaft, item count on
 * the base). Hover a bone to lift it and flush it vermilion; click to filter
 * #menu-display to that category and scroll to it. Click again — or "Whole fish"
 * — to restore everything.
 *
 *   頭 Packages   背 Platters   腹 Rolls   尾 Add-Ons
 *
 * RESILIENCE / a11y:
 *  - The <button> legend below is the real, keyboard-accessible control; the SVG
 *    is a pointer/visual enhancement (aria-hidden). Hover + click drive the same
 *    functions; legend hover lifts the matching bone.
 *  - If this script never runs, #menu-display still renders every category in
 *    full (menu-display.js is independent). Nothing here is required to see the
 *    menu — it only adds a way to filter it.
 * ==========================================================================*/
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  var CUTS = [
    { cat: "packages", jp: "頭", name: "Packages", label: "Catering Packages",     bx: 300 },
    { cat: "platters", jp: "背", name: "Platters", label: "Party Trays & Platters", bx: 462 },
    { cat: "rolls",    jp: "腹", name: "Rolls",    label: "À La Carte Rolls",       bx: 624 },
    { cat: "addons",   jp: "尾", name: "Add-Ons",  label: "Sides & Add-Ons",        bx: 775 }
  ];

  // body used only to clip the flesh fillets (head left, tail base right, no fin)
  var BODY = "M120,250 C150,176 262,150 392,150 C582,150 738,182 858,232 " +
    "C864,240 864,260 858,268 C738,318 582,348 392,348 C262,348 150,324 120,250 Z";

  var seed = 99173;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  var active = null;            // current category or null (whole fish)
  var groupByCat = {};          // cat -> bone <g>
  var btnByCat = {};            // cat -> legend <button>

  function hoverBone(cat, on) {
    var g = groupByCat[cat];
    if (g) g.classList.toggle("hover", on && cat !== active);
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
      var g = groupByCat[c.cat];
      if (g) { g.classList.toggle("on", on); g.classList.remove("hover"); g.setAttribute("aria-pressed", String(on)); }
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
  function buildSVG(counts) {
    var host = document.getElementById("sm-canvas");
    if (!host) return;
    host.setAttribute("aria-hidden", "true");

    var svg = el("svg", { viewBox: "0 0 1000 470", xmlns: SVGNS, "class": "sm-svg" }, host);
    var defs = el("defs", {}, svg);
    var grad = el("linearGradient", { id: "smFlesh", x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
    el("stop", { offset: "0", "stop-color": "#E98A67" }, grad);
    el("stop", { offset: ".5", "stop-color": "#C9552F" }, grad);
    el("stop", { offset: "1", "stop-color": "#9A3E22" }, grad);
    var clip = el("clipPath", { id: "smBodyClip" }, defs);
    el("path", { d: BODY }, clip);

    /* (1) skeleton */
    var sk = el("g", { "class": "sm-skel" }, svg);
    el("path", { d: "M182,250 C400,245 650,247 856,250", "class": "sm-spine" }, sk);
    for (var x = 210; x <= 838; x += 26) el("line", { x1: x, y1: 242, x2: x, y2: 258, "class": "sm-bone" }, sk);
    for (var rx = 250; rx <= 800; rx += 34) {
      var depth = 90 * Math.sqrt(Math.max(0, 1 - Math.pow((rx - 470) / 400, 2)));
      el("path", { d: "M" + rx + ",256 q " + (8 + rnd() * 4).toFixed(1) + "," + (depth * 0.5).toFixed(1) + " -7," + (depth * 0.85).toFixed(1), "class": "sm-bone thin", "clip-path": "url(#smBodyClip)" }, sk);
      if (rx < 720) el("path", { d: "M" + rx + ",244 q " + (6 + rnd() * 4).toFixed(1) + "," + (-depth * 0.4).toFixed(1) + " -5," + (-depth * 0.62).toFixed(1), "class": "sm-bone thin", "clip-path": "url(#smBodyClip)" }, sk);
    }
    // skull + eye + gill arch
    el("path", { d: "M182,250 C168,212 150,196 120,194 C94,192 78,214 77,240 C76,260 90,288 122,300 C152,310 172,288 182,250 Z", "class": "sm-bone" }, sk);
    el("path", { d: "M150,205 C150,238 150,262 150,296", "class": "sm-bone thin" }, sk);
    el("circle", { cx: 120, cy: 236, r: 11, "class": "sm-eye-socket" }, sk);
    el("circle", { cx: 120, cy: 236, r: 4.5, "class": "sm-eye" }, sk);
    // tail rays
    [[962, 182], [968, 214], [970, 250], [968, 286], [962, 318]].forEach(function (t) {
      el("line", { x1: 856, y1: 250, x2: t[0], y2: t[1], "class": "sm-bone" }, sk);
    });
    el("line", { x1: 900, y1: 206, x2: 906, y2: 294, "class": "sm-bone thin" }, sk);
    // small decorative neural spines between the selectors
    [230, 382, 543, 700, 838].forEach(function (nx) {
      el("line", { x1: nx, y1: 246, x2: nx, y2: 196, "class": "sm-bone thin" }, sk);
    });

    /* (2) selector dog-bones */
    CUTS.forEach(function (c, i) {
      var g = el("g", { "class": "sm-pick d" + i, "data-cat": c.cat, role: "button", tabindex: "0", "aria-pressed": "false", "aria-label": c.label + ", " + counts[c.cat] + " items" }, svg);
      var lift = el("g", { "class": "sm-lift" }, g);
      var bx = c.bx, top = 104, bot = 248, r = 18, w = 24;
      el("rect", { x: bx - w / 2, y: top, width: w, height: bot - top, rx: w / 2, "class": "sm-slat" }, lift);
      el("circle", { cx: bx, cy: top + 4, r: r, "class": "sm-knob" }, lift);
      el("circle", { cx: bx, cy: bot - 4, r: r, "class": "sm-knob" }, lift);
      el("text", { x: bx, y: top + 10, "text-anchor": "middle", "class": "sm-jp" }, lift).textContent = c.jp;
      var mid = (top + bot) / 2;
      var tn = el("text", { x: bx, y: mid, "text-anchor": "middle", "class": "sm-name", transform: "rotate(-90 " + bx + " " + mid + ")" }, lift);
      tn.textContent = c.name;
      el("text", { x: bx, y: bot - 1, "text-anchor": "middle", "class": "sm-count" }, lift).textContent = counts[c.cat];
      el("rect", { x: bx - r - 2, y: top - r, width: (r + 2) * 2, height: (bot - top) + r * 2, fill: "transparent", "class": "sm-hit" }, g);
      groupByCat[c.cat] = g;
      g.addEventListener("mouseenter", function () { hoverBone(c.cat, true); });
      g.addEventListener("mouseleave", function () { hoverBone(c.cat, false); });
      g.addEventListener("click", function () { select(c.cat); });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); select(c.cat); }
      });
    });

    /* (3) flesh fillets (peel away on skinning) */
    var fl = el("g", { "clip-path": "url(#smBodyClip)" }, svg);
    var topF = el("g", { "class": "sm-fillet sm-fillet-top" }, fl);
    el("rect", { x: 70, y: 60, width: 920, height: 190, fill: "url(#smFlesh)" }, topF);
    el("path", { d: "M120,250 C150,176 262,150 392,150 C582,150 738,182 858,232", "class": "sm-skin-edge" }, topF);
    var botF = el("g", { "class": "sm-fillet sm-fillet-bot" }, fl);
    el("rect", { x: 70, y: 250, width: 920, height: 190, fill: "url(#smFlesh)" }, botF);
    el("path", { d: "M120,250 C150,324 262,348 392,348 C582,348 738,318 858,268", "class": "sm-skin-edge" }, botF);
  }

  function buildLegend(counts) {
    var host = document.getElementById("sm-legend");
    if (!host) return;
    CUTS.forEach(function (c) {
      var n = counts[c.cat];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sm-cut-btn";
      b.setAttribute("data-cat", c.cat);
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = '<span class="sm-btn-jp" aria-hidden="true">' + c.jp + '</span>' +
        '<span class="sm-btn-name">' + c.label + '</span>' +
        '<span class="sm-btn-count mono">' + n + (n === 1 ? " item" : " items") + '</span>';
      b.addEventListener("mouseenter", function () { hoverBone(c.cat, true); });
      b.addEventListener("mouseleave", function () { hoverBone(c.cat, false); });
      b.addEventListener("focus", function () { hoverBone(c.cat, true); });
      b.addEventListener("blur", function () { hoverBone(c.cat, false); });
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

  // Reveal (skin the fish) when the section scrolls into view — once.
  function armReveal() {
    var wrap = document.getElementById("salmon-menu");
    var canvas = document.getElementById("sm-canvas");
    if (!wrap || !canvas) return;
    function skin() { canvas.classList.add("is-skinned"); }
    if (reduced || !("IntersectionObserver" in window)) { skin(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { skin(); io.disconnect(); }
      });
    }, { threshold: 0.35 });
    io.observe(canvas);
  }

  function init() {
    if (!document.getElementById("salmon-menu")) return;
    var menu = (typeof window.getMenu === "function") ? window.getMenu() : (window.MENU || {});
    var counts = {};
    CUTS.forEach(function (c) { counts[c.cat] = (menu[c.cat] || []).length; });
    buildSVG(counts);
    buildLegend(counts);
    armReveal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
