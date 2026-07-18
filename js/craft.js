/* ============================================================================
 * The Craft (js/craft.js) — scroll-driven ink drawings for craft.html
 * ----------------------------------------------------------------------------
 * Two pinned, scrub-linked scenes (GSAP ScrollTrigger, scrub — never autoplay):
 *   Scene 01 #stage-nigiri : a salmon nigiri assembles layer by layer
 *                            (rice draws on -> wasabi -> salmon lands -> nori
 *                             wraps -> glaze/sesame/callouts/stamp).
 *   Scene 02 #stage-salmon : a whole salmon is read head-to-tail; a scan line
 *                            picks the flesh away and reveals a procedurally
 *                            generated skeleton (skull, vertebrae, ribs, rays).
 *
 * RESILIENCE (same contract as polish.js):
 *  - The SVGs are authored in their FINAL, fully-assembled state. All initial
 *    "hidden" states are applied by gsap.set() at runtime. No JS / no GSAP =>
 *    both drawings render complete and the page still reads.
 *  - prefers-reduced-motion (or missing ScrollTrigger): no pinning, no scrub —
 *    static finished nigiri + a half-flesh/half-bone salmon with all labels.
 *  - Lazy init: procedural geometry + timelines are only built when a stage
 *    approaches the viewport (IntersectionObserver, generous rootMargin).
 * ==========================================================================*/
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";
  var hasST = hasGsap && typeof window.ScrollTrigger !== "undefined";

  /* Deterministic pseudo-random (stable art between visits) */
  var seed = 20140404;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

  var SVGNS = "http://www.w3.org/2000/svg";
  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ------------------------------------------------------------------ *
   * Procedural geometry
   * ------------------------------------------------------------------ */
  function genGrains() {
    var g = document.getElementById("n-grains");
    if (!g || g.childNodes.length) return;
    for (var i = 0; i < 84; i++) {
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

  /* Fish body half-height at x (nose 62 .. peduncle 812, centreline y=236) */
  function halfH(x) {
    var t = (x - 437) / 380;
    var h = 118 * Math.sqrt(Math.max(0, 1 - t * t));
    return Math.max(16, h);
  }

  function genScales() {
    var g = document.getElementById("s-scales");
    if (!g || g.childNodes.length) return;
    var row = 0;
    for (var y = 150; y <= 330; y += 24) {
      var off = (row % 2) ? 15 : 0;
      for (var x = 250 + off; x <= 800; x += 30) {
        if (Math.abs(y - 236) > halfH(x) - 10) continue;
        el("path", { d: "M" + x + "," + y + " q7,9 14,0", "class": "scale" }, g);
      }
      row++;
    }
  }

  function genBones() {
    var spine = document.getElementById("s-spine");
    var ribs = document.getElementById("s-ribs");
    var rays = document.getElementById("s-tailrays");
    var raysF = document.getElementById("s-tailrays-flesh");
    if (!spine || spine.childNodes.length) return;

    el("path", { d: "M252,228 L812,228" }, spine);
    el("path", { d: "M252,240 L812,240" }, spine);

    for (var x = 258; x <= 806; x += 14.5) {
      el("line", { x1: x, y1: 226, x2: x, y2: 242 }, spine);
      var hh = halfH(x);
      var j = (rnd() - 0.5) * 6;
      if (x < 792) {
        el("line", { x1: x, y1: 226, x2: x + 16, y2: (236 - hh * 0.78 + j).toFixed(1) }, ribs);
      }
      if (x < 560) {
        el("path", {
          d: "M" + x + ",242 q" + (10 + j).toFixed(1) + "," + (hh * 0.45).toFixed(1) +
             " -6," + (hh * 0.82).toFixed(1)
        }, ribs);
      } else if (x < 792) {
        el("line", { x1: x, y1: 242, x2: x + 14, y2: (236 + hh * 0.72 + j).toFixed(1) }, ribs);
      }
    }

    var tips = [[918,148],[926,168],[922,190],[910,212],[902,236],[910,260],[922,282],[926,304],[918,324]];
    tips.forEach(function (t) {
      el("line", { x1: 824, y1: 236, x2: t[0], y2: t[1] }, rays);
      if (raysF) el("line", { x1: 824, y1: 236, x2: t[0], y2: t[1] }, raysF);
    });
  }

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  function prepDraw(sel) {
    // stroke-dash "draw on" prep; returns the elements
    var els = gsap.utils.toArray(sel);
    els.forEach(function (p) {
      var len = p.getTotalLength ? p.getTotalLength() : 0;
      if (len) {
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
      }
    });
    return els;
  }

  function capWindows(tl, container, windows) {
    // windows: [[in, out|null], ...] on the master timeline's time axis
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

  /* ------------------------------------------------------------------ *
   * Scene 01 — nigiri assembly
   * ------------------------------------------------------------------ */
  function buildNigiri(stage) {
    genGrains();

    var riceDraw = prepDraw("#rice-body");
    var wasabiDraw = prepDraw("#wasabi-body");
    var salmonDraw = prepDraw("#salmon-body");
    var striae = prepDraw("#n-striations path");
    var glaze = prepDraw("#n-glaze");

    // Initial hidden states (JS-only, keeps no-JS render complete)
    gsap.set("#n-grid line", { scaleX: 0, transformOrigin: "left center" });
    gsap.set("#n-grid path", { autoAlpha: 0 });
    gsap.set("#rice-body", { fillOpacity: 0 });
    gsap.set("#n-grains path", { autoAlpha: 0 });
    gsap.set("#wasabi-body", { fillOpacity: 0 });
    gsap.set("#n-salmon", { y: -320 });
    gsap.set("#salmon-body", { fillOpacity: 0 });
    gsap.set("#nori-clip-rect", { attr: { height: 0 } });
    gsap.set("#n-seeds ellipse", { autoAlpha: 0, y: -46 });
    gsap.set("#n-callouts .co", { autoAlpha: 0, y: 8 });
    gsap.set("#n-stamp", { autoAlpha: 0, scale: 1.6, transformOrigin: "center center" });

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: stage, pin: true, anticipatePin: 1,
        start: "top top", end: "+=340%", scrub: 0.6
      }
    });
    var onUp = wireProgress(stage, tl.scrollTrigger);
    tl.eventCallback("onUpdate", onUp);

    /* 01 — shari */
    tl.to("#n-grid line", { scaleX: 1, duration: 0.5, ease: "power2.out" }, 0)
      .to("#n-grid path", { autoAlpha: 0.55, duration: 0.4 }, 0.2)
      .to(riceDraw, { strokeDashoffset: 0, duration: 1.0, ease: "power1.inOut" }, 0.15)
      .to("#rice-body", { fillOpacity: 1, duration: 0.5 }, 0.85)
      .to("#n-grains path", {
        autoAlpha: 1, duration: 0.25,
        stagger: { each: 0.008, from: "random" }
      }, 0.7);

    /* 02 — wasabi */
    tl.to(wasabiDraw, { strokeDashoffset: 0, duration: 0.45, ease: "power1.inOut" }, 1.95)
      .to("#wasabi-body", { fillOpacity: 1, duration: 0.3 }, 2.3)
      .to("#co-wasabi", { autoAlpha: 1, y: 0, duration: 0.3 }, 2.45)
      .to("#co-wasabi", { autoAlpha: 0, duration: 0.25 }, 3.15);

    /* 03 — the salmon lands */
    tl.to("#n-salmon", { y: 0, duration: 1.15, ease: "power2.in" }, 3.45)
      .to(salmonDraw, { strokeDashoffset: 0, duration: 0.9, ease: "power1.inOut" }, 3.45)
      .to("#salmon-body", { fillOpacity: 1, duration: 0.6 }, 3.8)
      .to("#n-rice", { scaleY: 0.955, transformOrigin: "center bottom", duration: 0.12, ease: "power2.out" }, 4.6)
      .to("#n-rice", { scaleY: 1, duration: 0.3, ease: "power2.out" }, 4.75)
      .to(striae, { strokeDashoffset: 0, duration: 0.55, stagger: 0.1, ease: "power1.inOut" }, 4.75);

    /* 04 — nori wraps */
    tl.to("#nori-clip-rect", { attr: { height: 200 }, duration: 1.25, ease: "power1.inOut" }, 5.85);

    /* 05 — finish */
    tl.to(glaze, { strokeDashoffset: 0, duration: 0.6, ease: "power1.inOut" }, 7.25)
      .to("#n-seeds ellipse", { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.09, ease: "power2.in" }, 7.5)
      .to(["#co-shari", "#co-neta", "#co-nori", "#co-dim"],
          { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.22 }, 7.9)
      .to("#n-stamp", { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.5)" }, 9.2)
      .to({}, { duration: 0.4 }); // settle beat before unpin

    capWindows(tl, document.getElementById("caps-nigiri"),
      [[0.05, 1.85], [2.0, 3.3], [3.5, 5.7], [5.9, 7.1], [7.3, null]]);
  }

  /* ------------------------------------------------------------------ *
   * Scene 02 — salmon anatomy scan
   * ------------------------------------------------------------------ */
  var scanState = { x: 62 };
  function applyScan(x) {
    var skel = document.getElementById("skel-clip-rect");
    var flesh = document.getElementById("flesh-clip-rect");
    var scan = document.getElementById("s-scan");
    if (skel) skel.setAttribute("width", Math.max(0, x - 40).toFixed(1));
    if (flesh) {
      flesh.setAttribute("x", x.toFixed(1));
      flesh.setAttribute("width", Math.max(0, 960 - x).toFixed(1));
    }
    if (scan) scan.setAttribute("transform", "translate(" + x.toFixed(1) + ",0)");
  }

  function buildSalmon(stage) {
    genScales();
    genBones();

    gsap.set("#s-labels .co", { autoAlpha: 0, y: 8 });
    applyScan(62);

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: stage, pin: true, anticipatePin: 1,
        start: "top top", end: "+=300%", scrub: 0.6
      }
    });
    var onUp = wireProgress(stage, tl.scrollTrigger);
    tl.eventCallback("onUpdate", onUp);

    scanState.x = 62;
    tl.to(scanState, {
      x: 940, duration: 8.4, ease: "none",
      onUpdate: function () { applyScan(scanState.x); }
    }, 0.8);

    // Labels surface as the scan line passes their anchor
    tl.to("#sl-cranium", { autoAlpha: 1, y: 0, duration: 0.35 }, 1.85)
      .to("#sl-ribs",    { autoAlpha: 1, y: 0, duration: 0.35 }, 3.6)
      .to("#sl-spine",   { autoAlpha: 1, y: 0, duration: 0.35 }, 5.6)
      .to("#sl-caudal",  { autoAlpha: 1, y: 0, duration: 0.35 }, 8.3);

    // Scan line bows out once the fish is fully read
    tl.to("#s-scan", { autoAlpha: 0, duration: 0.45 }, 9.35)
      .to({}, { duration: 0.2 });

    capWindows(tl, document.getElementById("caps-salmon"),
      [[0.05, 2.2], [2.35, 4.85], [5.0, 7.35], [7.5, null]]);
  }

  /* ------------------------------------------------------------------ *
   * Static fallback (reduced motion / no ScrollTrigger)
   * ------------------------------------------------------------------ */
  function staticFallback() {
    genGrains(); genScales(); genBones();
    applyScan(520); // half flesh, half bone — the idea reads at a glance
    document.querySelectorAll(".craft-stage").forEach(function (s) {
      s.classList.add("stage-static");
    });
    document.querySelectorAll(".stage-captions").forEach(function (c) {
      c.classList.add("caps-static");
    });
  }

  /* ------------------------------------------------------------------ *
   * Init — lazy, near-viewport
   * ------------------------------------------------------------------ */
  function init() {
    var nigiri = document.getElementById("stage-nigiri");
    var salmon = document.getElementById("stage-salmon");
    if (!nigiri && !salmon) return;

    if (reduced || !hasST) { staticFallback(); return; }
    gsap.registerPlugin(ScrollTrigger);

    var pending = { "stage-nigiri": buildNigiri, "stage-salmon": buildSalmon };
    function buildFor(elm) {
      var fn = pending[elm.id];
      if (!fn) return;
      delete pending[elm.id];
      fn(elm);
      ScrollTrigger.refresh();
    }

    if (typeof IntersectionObserver === "undefined") {
      if (nigiri) buildFor(nigiri);
      if (salmon) buildFor(salmon);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { buildFor(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: "900px 0px 900px 0px" });
    if (nigiri) io.observe(nigiri);
    if (salmon) io.observe(salmon);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
