/* ============================================================================
 * Home nigiri (js/home-nigiri.js), a lighter scroll-built sushi moment
 * ----------------------------------------------------------------------------
 * A single pinned, scrub-linked scene on the homepage: one salmon nigiri
 * assembles as you scroll (rice draws on -> grains -> the salmon slice lands ->
 * nori wraps -> glaze, sesame, stamp), then a CTA surfaces linking through to
 * the full craft.html showcase.
 *
 * This is a trimmed sibling of js/craft.js (Scene 01). It uses its OWN element
 * IDs (all "hn-" prefixed) so it can never collide with the craft page, and it
 * follows the same resilience contract:
 *  - The SVG is authored in its FINAL assembled state. All "hidden" starts are
 *    applied by gsap.set() at runtime. No JS / no GSAP => finished nigiri + CTA.
 *  - prefers-reduced-motion (or no ScrollTrigger): no pin, no scrub, a static
 *    finished nigiri with the last caption and the CTA showing.
 *  - Lazy init: geometry + timeline are only built as the stage nears view.
 * ==========================================================================*/
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";
  var hasST = hasGsap && typeof window.ScrollTrigger !== "undefined";

  /* Deterministic pseudo-random (stable rice between visits) */
  var seed = 74920115;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

  var SVGNS = "http://www.w3.org/2000/svg";
  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function genGrains() {
    var g = document.getElementById("hn-grains");
    if (!g || g.childNodes.length) return;
    for (var i = 0; i < 78; i++) {
      var a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
      var x = 450 + Math.cos(a) * r * 122;
      var y = 400 + Math.sin(a) * r * 42;
      el("path", {
        d: "M" + x.toFixed(1) + "," + y.toFixed(1) + " q5,-4 10,0",
        transform: "rotate(" + Math.round(rnd() * 180) + " " + x.toFixed(1) + " " + y.toFixed(1) + ")",
        "class": "grain"
      }, g);
    }
  }

  function prepDraw(sel) {
    var els = gsap.utils.toArray(sel);
    els.forEach(function (p) {
      var len = p.getTotalLength ? p.getTotalLength() : 0;
      if (len) { p.style.strokeDasharray = len; p.style.strokeDashoffset = len; }
    });
    return els;
  }

  function capWindows(tl, container, windows) {
    if (!container) return;
    var caps = container.querySelectorAll(".cap");
    container.classList.add("caps-live");
    gsap.set(caps, { autoAlpha: 0, y: 26 });
    windows.forEach(function (w, i) {
      if (!caps[i]) return;
      tl.to(caps[i], { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, w[0]);
      if (w[1] != null) tl.to(caps[i], { autoAlpha: 0, y: -20, duration: 0.3, ease: "power2.in" }, w[1]);
    });
  }

  function wireProgress(stage, st) {
    var bar = stage.querySelector(".stage-bar i");
    var pct = stage.querySelector(".stage-pct");
    return function () {
      var p = st.progress;
      if (bar) bar.style.transform = "scaleX(" + p + ")";
      if (pct) pct.textContent = ("00" + Math.round(p * 100)).slice(-3);
    };
  }

  function build(stage) {
    genGrains();

    var riceDraw = prepDraw("#hn-rice-body");
    var salmonDraw = prepDraw("#hn-salmon-body");
    var striae = prepDraw("#hn-striations path");
    var glaze = prepDraw("#hn-glaze");

    /* Initial hidden states (JS-only, keeps no-JS render complete) */
    gsap.set("#hn-grid line", { scaleX: 0, transformOrigin: "left center" });
    gsap.set("#hn-grid path", { autoAlpha: 0 });
    gsap.set("#hn-rice-body", { fillOpacity: 0 });
    gsap.set("#hn-grains path", { autoAlpha: 0 });
    gsap.set("#hn-salmon", { y: -320 });
    gsap.set("#hn-salmon-body", { fillOpacity: 0 });
    gsap.set("#hn-nori-clip-rect", { attr: { height: 0 } });
    gsap.set("#hn-seeds ellipse", { autoAlpha: 0, y: -46 });
    gsap.set("#hn-stamp", { autoAlpha: 0, scale: 1.6, transformOrigin: "center center" });
    gsap.set("#hn-cta", { autoAlpha: 0, y: 16 });

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: stage, pin: true, anticipatePin: 1,
        start: "top top", end: "+=280%", scrub: 0.6
      }
    });
    tl.eventCallback("onUpdate", wireProgress(stage, tl.scrollTrigger));

    /* 01, shari (rice) */
    tl.to("#hn-grid line", { scaleX: 1, duration: 0.5, ease: "power2.out" }, 0)
      .to("#hn-grid path", { autoAlpha: 0.55, duration: 0.4 }, 0.2)
      .to(riceDraw, { strokeDashoffset: 0, duration: 1.0, ease: "power1.inOut" }, 0.15)
      .to("#hn-rice-body", { fillOpacity: 1, duration: 0.5 }, 0.85)
      .to("#hn-grains path", { autoAlpha: 1, duration: 0.25, stagger: { each: 0.008, from: "random" } }, 0.7);

    /* 02, neta (the salmon lands) */
    tl.to("#hn-salmon", { y: 0, duration: 1.15, ease: "power2.in" }, 2.2)
      .to(salmonDraw, { strokeDashoffset: 0, duration: 0.9, ease: "power1.inOut" }, 2.2)
      .to("#hn-salmon-body", { fillOpacity: 1, duration: 0.6, ease: "none" }, 2.55)
      .to("#hn-rice", { scaleY: 0.955, transformOrigin: "center bottom", duration: 0.12, ease: "power2.out" }, 3.35)
      .to("#hn-rice", { scaleY: 1, duration: 0.3, ease: "power2.out" }, 3.5)
      .to(striae, { strokeDashoffset: 0, duration: 0.55, stagger: 0.1, ease: "power1.inOut" }, 3.5);

    /* 03, finish (nori wrap, glaze, sesame, stamp, CTA) */
    tl.to("#hn-nori-clip-rect", { attr: { height: 200 }, duration: 1.05, ease: "power1.inOut" }, 4.5)
      .to(glaze, { strokeDashoffset: 0, duration: 0.6, ease: "power1.inOut" }, 5.55)
      .to("#hn-seeds ellipse", { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.09, ease: "power2.in" }, 5.8)
      .to("#hn-stamp", { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.5)" }, 6.4)
      .to("#hn-cta", { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, 6.7)
      .to({}, { duration: 0.4 }); // settle beat before unpin

    capWindows(tl, document.getElementById("hn-caps"),
      [[0.05, 2.0], [2.2, 4.3], [4.5, null]]);
  }

  function staticFallback(stage) {
    genGrains();
    stage.classList.add("stage-static");
    var caps = document.getElementById("hn-caps");
    if (caps) caps.classList.add("caps-static");
    // CTA + finished nigiri are already in the authored SVG; nothing to reveal.
  }

  function init() {
    var stage = document.getElementById("stage-home-nigiri");
    if (!stage) return;

    if (reduced || !hasST) { staticFallback(stage); return; }
    gsap.registerPlugin(ScrollTrigger);

    var built = false;
    function go() { if (built) return; built = true; build(stage); ScrollTrigger.refresh(); }

    if (typeof IntersectionObserver === "undefined") { go(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { go(); io.unobserve(en.target); } });
    }, { rootMargin: "900px 0px 900px 0px" });
    io.observe(stage);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
