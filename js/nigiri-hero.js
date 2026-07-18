/* ============================================================================
 * Nigiri hero (js/nigiri-hero.js) — photoreal layers, assembled by scroll
 * ----------------------------------------------------------------------------
 * The #nigiri3d hero. Three photoreal cutouts (Higgsfield-generated, then
 * background-removed) — rice, salmon, nori band — start split apart and
 * converge into a finished salmon nigiri as you scroll through the pinned
 * section. Rice settles, the salmon slice descends and drapes, the nori band
 * wraps last. Pure transforms; no video, no WebGL.
 *
 * RESILIENCE:
 *  - The layers' ASSEMBLED positions live in CSS, so with no JS / no GSAP /
 *    reduced-motion the nigiri simply renders finished and centered.
 *  - The exploded start + the scroll choreography are applied only by this JS.
 *  - Transforms are written every frame the section is on-screen (rAF + IO),
 *    driven by ScrollTrigger progress.
 * ==========================================================================*/
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasST = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function seg(p, a, b) { return clamp01((p - a) / (b - a)); }

  function init() {
    var sec = document.getElementById("nigiri3d");
    if (!sec) return;
    var rice = sec.querySelector(".nh-rice");
    var salmon = sec.querySelector(".nh-salmon");
    var nori = sec.querySelector(".nh-nori");
    if (!rice || !salmon || !nori) return;

    /* apply the exploded/assembled state for a given global progress p */
    function render(p) {
      var rp = easeOut(seg(p, 0.0, 0.34));     // rice settles
      var sp = easeOut(seg(p, 0.30, 0.70));    // salmon descends + drapes
      var np = easeOut(seg(p, 0.62, 1.0));     // nori wraps last

      rice.style.opacity = rp;
      rice.style.transform = "translateY(" + ((1 - rp) * 30).toFixed(2) + "%)";

      salmon.style.opacity = sp;
      salmon.style.transform =
        "translateY(" + (-15 + (1 - sp) * -150).toFixed(2) + "%) " +
        "rotate(" + ((1 - sp) * -6).toFixed(2) + "deg)";

      nori.style.opacity = np;
      nori.style.transform =
        "translate(-50%,-50%) translateY(" + (4.4 + (1 - np) * -300).toFixed(2) + "%)";
    }

    /* captions */
    var CAPS = [
      ["01 — シャリ", "The rice, pressed by hand."],
      ["02 — ネタ", "Ōra King salmon, draped on."],
      ["03 — 仕上げ", "Wrapped in nori. One clean bite."]
    ];
    var stepEl = sec.querySelector("#n3-caption .n3-step");
    var lineEl = sec.querySelector("#n3-caption .n3-line");
    var lastCap = -1;
    function setCaption(p) {
      var i = p < 0.34 ? 0 : p < 0.66 ? 1 : 2;
      if (i === lastCap) return;
      lastCap = i;
      if (stepEl) stepEl.textContent = CAPS[i][0];
      if (lineEl) lineEl.textContent = CAPS[i][1];
    }

    if (reduced || !hasST) {
      // Static assembled state (CSS base already positions the layers).
      rice.style.opacity = salmon.style.opacity = nori.style.opacity = 1;
      setCaption(1);
      return;
    }

    render(0);   // start exploded

    var progress = 0;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: sec, start: "top top", end: "+=260%", pin: ".n3-pin",
      onUpdate: function (self) { progress = self.progress; setCaption(progress); }
    });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });

    var visible = true, cur = 0;
    if (typeof IntersectionObserver !== "undefined") {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { visible = e.isIntersecting; });
      }, { rootMargin: "200px 0px 200px 0px" }).observe(sec);
    }
    function tick() {
      requestAnimationFrame(tick);
      if (!visible) return;
      cur += (progress - cur) * 0.16;          // ease toward scroll target
      if (Math.abs(progress - cur) < 0.0005) cur = progress;
      render(cur);
    }
    tick();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
