/* ============================================================================
 * Motion system (js/polish.js) — "Washi & Ink"
 * ----------------------------------------------------------------------------
 * Lenis smooth scroll + GSAP/ScrollTrigger choreography + custom cursor +
 * magnetic buttons + live-total pulse.
 *
 * RESILIENCE RULES:
 *  - No element is hidden by CSS. All initial "hidden" states are applied by
 *    GSAP (gsap.from / gsap.set) at runtime, so if any CDN fails or JS errors,
 *    the site renders fully visible and fully functional.
 *  - prefers-reduced-motion disables smoothing and reveal animation.
 *
 * DECLARATIVE HOOKS (add in markup, all optional):
 *  [data-reveal]           fade/rise on scroll (data-delay="0.15" optional)
 *  [data-reveal="clip"]    clip-path wipe upward
 *  .kl > span              kinetic line: span slides up from below its mask
 *  [data-parallax="0.2"]   translateY parallax by factor
 *  [data-count="480"]      counts up when scrolled into view (data-suffix)
 *  .magnetic               magnetic hover attraction
 * ==========================================================================*/
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var hasGsap = typeof window.gsap !== "undefined";
  var hasST = hasGsap && typeof window.ScrollTrigger !== "undefined";
  var lenis = null;

  function init() {
    if (hasST) gsap.registerPlugin(ScrollTrigger);

    /* ---------------- Lenis smooth scroll ---------------- */
    if (!reduced && typeof window.Lenis !== "undefined") {
      try {
        lenis = new Lenis({
          duration: 1.15,
          easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
          smoothWheel: true
        });
        if (hasGsap) {
          lenis.on("scroll", function () { if (hasST) ScrollTrigger.update(); });
          gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
          gsap.ticker.lagSmoothing(0);
        } else {
          (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
        }
      } catch (e) { lenis = null; }
    }

    /* Smooth in-page anchors (respects Lenis) */
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href*="#"]') : null;
      if (!a) return;
      var href = a.getAttribute("href");
      var hashIdx = href.indexOf("#");
      var path = href.slice(0, hashIdx);
      var page = location.pathname.split("/").pop() || "index.html";
      if (path && path !== page) return; // cross-page anchor: let browser handle
      var target = document.getElementById(href.slice(hashIdx + 1));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.4 });
      else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });

    if (!hasGsap || reduced) { initCursor(); return; }

    /* ---------------- Hero intro ---------------- */
    var heroLines = gsap.utils.toArray(".hero .kl > span");
    if (heroLines.length) {
      var tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.from(heroLines, {
        yPercent: 112, rotate: 2.5, duration: 1.25, stagger: 0.12
      }, 0.15)
      .from(".hero-disc", { scale: 0.6, opacity: 0, duration: 1.6, ease: "power3.out" }, 0.1)
      .from(".hero-kanji", { opacity: 0, y: -30, duration: 1 }, 0.7)
      .from(".hero-meta-top > *", { opacity: 0, y: 14, duration: 0.7, stagger: 0.08 }, 0.6)
      .from(".hero-sub > *", { opacity: 0, y: 24, duration: 0.9, stagger: 0.1 }, 0.75)
      .from(".hero-foot", { opacity: 0, duration: 0.8 }, 1.0)
      .from("#site-header", { yPercent: -100, opacity: 0, duration: 0.8, ease: "power3.out" }, 0.5);
    }

    if (!hasST) { initCursor(); initMagnetic(); return; }

    /* ---------------- Kinetic lines outside hero ---------------- */
    gsap.utils.toArray(".kl > span").forEach(function (span) {
      if (span.closest(".hero")) return;
      gsap.from(span, {
        yPercent: 112, rotate: 2, duration: 1.1, ease: "power4.out",
        scrollTrigger: { trigger: span.parentNode, start: "top 88%", once: true }
      });
    });

    /* ---------------- Generic reveals ---------------- */
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      var mode = el.getAttribute("data-reveal");
      var delay = parseFloat(el.getAttribute("data-delay") || "0");
      if (mode === "clip") {
        gsap.from(el, {
          clipPath: "inset(0 0 100% 0)", duration: 1.2, delay: delay, ease: "power3.inOut",
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        });
      } else {
        gsap.from(el, {
          y: 44, opacity: 0, duration: 1.1, delay: delay, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true }
        });
      }
    });

    /* Staggered children: [data-reveal-stagger] > direct children */
    gsap.utils.toArray("[data-reveal-stagger]").forEach(function (el) {
      gsap.from(el.children, {
        y: 36, opacity: 0, duration: 0.9, ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });

    /* ---------------- Parallax ---------------- */
    gsap.utils.toArray("[data-parallax]").forEach(function (el) {
      var f = parseFloat(el.getAttribute("data-parallax") || "0.2");
      gsap.to(el, {
        yPercent: f * 100, ease: "none",
        scrollTrigger: { trigger: el.parentNode, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    /* ---------------- Counters ---------------- */
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var end = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      var obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.8, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
        onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; }
      });
    });

    /* ---------------- Marquee velocity skew ---------------- */
    var track = document.querySelector(".marquee-track");
    if (track) {
      var proxy = { skew: 0 };
      var clamp = gsap.utils.clamp(-8, 8);
      ScrollTrigger.create({
        onUpdate: function (self) {
          var skew = clamp(self.getVelocity() / -220);
          if (Math.abs(skew) > Math.abs(proxy.skew)) {
            proxy.skew = skew;
            gsap.to(proxy, {
              skew: 0, duration: 0.9, ease: "power3.out", overwrite: true,
              onUpdate: function () { track.style.transform = "skewX(" + proxy.skew + "deg)"; }
            });
          }
        }
      });
    }

    /* ---------------- Cart total pulse ---------------- */
    var totalEl = document.getElementById("cart-total");
    if (totalEl && typeof MutationObserver !== "undefined") {
      var mo = new MutationObserver(function () {
        gsap.fromTo(totalEl,
          { scale: 1.12, color: "#E8896F" },
          { scale: 1, color: "#F2EDE2", duration: 0.6, ease: "power3.out", clearProps: "color" });
      });
      mo.observe(totalEl, { childList: true, characterData: true, subtree: true });
      totalEl.style.display = "inline-block";
      totalEl.style.transformOrigin = "right center";
    }

    window.addEventListener("load", function () { ScrollTrigger.refresh(); });

    initCursor();
    initMagnetic();
  }

  /* ---------------- Magnetic hover ---------------- */
  function initMagnetic() {
    if (!finePointer || reduced || !hasGsap) return;
    gsap.utils.toArray(".magnetic").forEach(function (el) {
      var strength = parseFloat(el.getAttribute("data-strength") || "0.35");
      var xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      var yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener("mouseleave", function () { xTo(0); yTo(0); });
    });
  }

  /* ---------------- Custom cursor ---------------- */
  function initCursor() {
    if (!finePointer || reduced) return;
    var dot = document.createElement("div");
    var ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add("cursor-hidden");

    var mx = -100, my = -100, rx = -100, ry = -100, shown = false;
    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; document.body.classList.remove("cursor-hidden"); rx = mx; ry = my; }
    }, { passive: true });
    document.addEventListener("mouseleave", function () {
      shown = false; document.body.classList.add("cursor-hidden");
    });

    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(loop);
    })();

    var HOVER = "a, button, summary, input, textarea, select, label";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(HOVER)) ring.classList.add("is-hover");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(HOVER)) ring.classList.remove("is-hover");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
