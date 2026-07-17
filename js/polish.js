/* ============================================================================
 * Polish pass — motion & micro-interaction layer (js/polish.js)
 * ----------------------------------------------------------------------------
 * Purely additive: no business logic lives here. Safe to remove entirely —
 * the site still functions (this file only animates what other scripts render).
 *
 *  1. Sticky-header scrolled state + active nav link
 *  2. Choreographed scroll reveals (IntersectionObserver, staggered per group)
 *  3. Live count-up tween on the quote total (MutationObserver on #cart-total,
 *     so builder.js math stays untouched) + bump/pulse micro-interactions
 *  4. Sakura petal drift in the hero
 *  5. FAQ accordion
 *  6. Mobile floating quote bar (mirrors #cart-total)
 * All motion respects prefers-reduced-motion.
 * ==========================================================================*/
(function () {
  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function parseMoney(s) {
    var n = parseFloat(String(s || "").replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  function fmtMoney(n) {
    return "$" + (Math.round(n * 100) / 100).toFixed(2);
  }

  /* ---- 1. header ---- */
  function initHeader() {
    var header = document.getElementById("site-header");
    if (!header) return;
    function onScroll() {
      header.classList.toggle("scrolled", window.scrollY > 12);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var page = (location.pathname.split("/").pop() || "index.html");
    Array.prototype.forEach.call(document.querySelectorAll(".site-nav a"), function (a) {
      var href = a.getAttribute("href") || "";
      if (href.indexOf("#") === -1 && href === page) a.classList.add("active");
    });
  }

  /* ---- 2. scroll reveals ---- */
  function initReveals() {
    if (reduced || !("IntersectionObserver" in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        el.classList.add("rv-in");
        // After the reveal finishes, drop the reveal transition so hover
        // transitions (cards, buttons) get their own timing back.
        var delay = parseFloat(el.style.getPropertyValue("--rv-delay")) || 0;
        setTimeout(function () {
          el.classList.remove("rv", "rv-in");
          el.style.removeProperty("--rv-delay");
        }, delay + 850);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    function reveal(el, delayMs) {
      if (!el || el.classList.contains("rv")) return;
      // Never hide things already above the fold-bottom (e.g. deep-linked).
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.75 && r.bottom > 0) {
        // still reveal, but immediately-ish so nothing feels missing
        delayMs = Math.min(delayMs, 200);
      }
      el.classList.add("rv");
      if (delayMs) el.style.setProperty("--rv-delay", delayMs + "ms");
      io.observe(el);
    }

    // Solo blocks
    Array.prototype.forEach.call(
      document.querySelectorAll(".section-head, .recommend-box, .cart-panel, #booking-form, .prose > *, .page-body > *"),
      function (el) { reveal(el, 0); });

    // Staggered groups — stagger resets per container so each category
    // choreographs on its own as it scrolls in.
    function staggerGroup(containerSel, childSel, step, cap) {
      Array.prototype.forEach.call(document.querySelectorAll(containerSel), function (c) {
        Array.prototype.forEach.call(c.querySelectorAll(childSel), function (el, i) {
          reveal(el, Math.min(i * step, cap));
        });
      });
    }
    staggerGroup(".menu-cat", ".menu-card", 80, 480);
    staggerGroup(".builder-cat", ".builder-item", 50, 300);
    staggerGroup("body", ".menu-cat > h3, .menu-cat > .menu-cat-note", 0, 0);
    staggerGroup("body", ".builder-cat > h3", 0, 0);
    staggerGroup(".t-grid", ".testimonial", 120, 360);
    staggerGroup("body", ".faq-item", 60, 420);
    staggerGroup(".gallery-grid", ".gallery-ph", 70, 420);
    staggerGroup("#requests-list", ".req-card", 70, 350);
    staggerGroup("#price-editor", ".price-row", 25, 250);
  }

  /* ---- 3. live total tween ---- */
  function initMoneyMotion() {
    var totalEl = document.getElementById("cart-total");
    if (!totalEl || !("MutationObserver" in window)) return;

    var lastValue = parseMoney(totalEl.textContent);
    var rafId = null;

    function bump(el, cls) {
      el.classList.remove(cls);
      // force reflow so the animation can replay
      void el.offsetWidth;
      el.classList.add(cls);
    }

    function tweenTo(target) {
      var from = lastValue;
      lastValue = target;
      updateQuoteBar(target);
      if (reduced || from === target) {
        writeVal(fmtMoney(target));
        return;
      }
      if (rafId) cancelAnimationFrame(rafId);
      var t0 = performance.now(), dur = 420;
      bump(totalEl, "bump");
      (function step(now) {
        var p = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3); // ease-out cubic
        writeVal(fmtMoney(from + (target - from) * e));
        if (p < 1) rafId = requestAnimationFrame(step);
        else rafId = null;
      })(t0);
    }

    function writeVal(text) {
      totalEl.dataset.animVal = text;
      totalEl.textContent = text;
    }

    var mo = new MutationObserver(function () {
      var txt = totalEl.textContent;
      if (txt === totalEl.dataset.animVal) return; // our own write
      tweenTo(parseMoney(txt));
    });
    mo.observe(totalEl, { childList: true, characterData: true, subtree: true });

    // Subtle flash on subtotal / delivery fee when they change.
    ["cart-subtotal", "cart-deliveryfee"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var last = el.textContent;
      new MutationObserver(function () {
        if (el.textContent !== last) {
          last = el.textContent;
          if (!reduced) bump(el, "bump");
        }
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });

    // Ripple the receipt when +/- is tapped.
    var list = document.getElementById("builder-list");
    var panel = document.querySelector(".cart-panel");
    if (list && panel && !reduced) {
      list.addEventListener("click", function (e) {
        if (e.target.hasAttribute && (e.target.hasAttribute("data-inc") || e.target.hasAttribute("data-dec"))) {
          bump(panel, "pulse");
        }
      });
    }

    /* ---- 6. mobile floating quote bar ---- */
    var bar = document.createElement("a");
    bar.className = "mobile-total-bar";
    bar.href = "#booking";
    bar.innerHTML =
      '<span><span class="mtb-label">Your quote so far</span>' +
      '<span class="mtb-amount">$0.00</span></span>' +
      '<span class="mtb-go">Request quote &rarr;</span>';
    document.body.appendChild(bar);
    var amountEl = bar.querySelector(".mtb-amount");

    function updateQuoteBar(total) {
      if (amountEl) amountEl.textContent = fmtMoney(total);
      var show = total > 0;
      bar.classList.toggle("show", show);
      document.body.classList.toggle("has-quote-bar", show);
    }
    updateQuoteBar(lastValue);
  }

  /* ---- 4. sakura petals ---- */
  function initPetals() {
    var host = document.querySelector(".petals");
    if (!host || reduced) return;
    for (var i = 0; i < 12; i++) {
      var p = document.createElement("span");
      p.className = "petal";
      var size = 7 + Math.random() * 8;
      p.style.left = (Math.random() * 100) + "%";
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.setProperty("--dur", (10 + Math.random() * 9) + "s");
      p.style.setProperty("--delay", (-Math.random() * 19) + "s");
      p.style.setProperty("--sway", ((Math.random() * 180) - 90) + "px");
      host.appendChild(p);
    }
  }

  /* ---- tag color-coding (menu cards) ---- */
  function initTags() {
    var map = { vegetarian: "tag--veg", vegan: "tag--veg", raw: "tag--raw", "gluten-free": "tag--gf" };
    Array.prototype.forEach.call(document.querySelectorAll(".tag"), function (t) {
      var c = map[(t.textContent || "").trim()];
      if (c) t.classList.add(c);
    });
  }

  /* ---- 5. FAQ accordion ---- */
  function initFaq() {
    var items = document.querySelectorAll(".faq-item");
    if (!items.length) return;
    Array.prototype.forEach.call(items, function (item, i) {
      var h = item.querySelector("h3");
      if (!h) return;
      item.classList.add("faq-acc");
      if (i === 0) item.classList.add("open");
      h.addEventListener("click", function () {
        item.classList.toggle("open");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initHeader();
    initReveals();
    initMoneyMotion();
    initPetals();
    initTags();
    initFaq();
  });
})();
