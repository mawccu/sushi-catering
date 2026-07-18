/* ============================================================================
 * Shared site chrome (js/site.js) — "Washi & Ink" edition
 * ----------------------------------------------------------------------------
 * Injects nav + overlay menu + footer into pages that have
 *   <header id="site-header"></header> and <footer id="site-footer"></footer>
 * and fills [data-site="..."] placeholders from window.SITE.
 * ==========================================================================*/
(function () {
  var NAV = [
    { href: "index.html",          label: "Home" },
    { href: "craft.html",          label: "The Craft" },
    { href: "index.html#menu",     label: "Menu" },
    { href: "index.html#builder",  label: "Build a Quote" },
    { href: "about.html",          label: "About" },
    { href: "faq.html",            label: "FAQ" },
    { href: "gallery.html",        label: "Gallery" },
    { href: "admin.html",          label: "Admin" }
  ];

  function currentPage() {
    var p = location.pathname.split("/").pop() || "index.html";
    return p;
  }

  function init() {
    var header = document.getElementById("site-header");
    if (header) {
      var cur = currentPage();
      var links = NAV.filter(function (n) { return n.label !== "Admin"; }).map(function (n) {
        var isCur = n.href === cur;
        return '<a href="' + n.href + '"' + (isCur ? ' aria-current="page"' : '') +
          (n.label === "Build a Quote" ? ' class="nav-cta"' : '') + '>' + n.label + '</a>';
      }).join("");
      header.innerHTML =
        '<a class="brand" href="index.html">' +
          '<span class="brand-name">Sakura</span>' +
          '<span class="brand-kanji" aria-hidden="true">桜鮨</span>' +
        '</a>' +
        '<nav class="site-nav" aria-label="Main">' + links + '</nav>' +
        '<button type="button" class="nav-burger" aria-label="Open menu" aria-expanded="false">' +
          '<span></span><span></span><span></span>' +
        '</button>';

      // Full-screen overlay menu
      var overlay = document.createElement("div");
      overlay.id = "nav-overlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML =
        '<button type="button" class="overlay-close">Close ✕</button>' +
        NAV.map(function (n, i) {
          return '<a href="' + n.href + '" style="transition-delay:' + (0.06 * i + 0.12) + 's">' +
            '<span class="idx">0' + (i + 1) + '</span>' + n.label + '</a>';
        }).join("") +
        '<div class="overlay-foot"><span>' + window.SITE.name + '</span><span>' + window.SITE.phone + '</span></div>';
      document.body.appendChild(overlay);

      var burger = header.querySelector(".nav-burger");
      function setOpen(open) {
        overlay.classList.toggle("open", open);
        overlay.setAttribute("aria-hidden", String(!open));
        burger.setAttribute("aria-expanded", String(open));
      }
      burger.addEventListener("click", function () { setOpen(true); });
      overlay.querySelector(".overlay-close").addEventListener("click", function () { setOpen(false); });
      overlay.addEventListener("click", function (e) {
        if (e.target.tagName === "A") setOpen(false);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") setOpen(false);
      });

      // Scrolled state
      var onScroll = function () {
        header.classList.toggle("scrolled", (window.scrollY || 0) > 40);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    var footer = document.getElementById("site-footer");
    if (footer) {
      var year = new Date().getFullYear();
      footer.innerHTML =
        '<div class="foot-cta">' +
          '<span class="mono">予約 — Reserve your date</span>' +
          '<a class="foot-cta-link" href="index.html#builder">Planning something <span class="it">worth remembering?</span> <span class="arr">→</span></a>' +
        '</div>' +
        '<div class="foot-grid">' +
          '<div><h4>Contact</h4>' +
            '<p><a href="tel:+14155550182">' + window.SITE.phone + '</a><br>' +
            '<a href="mailto:' + window.SITE.email + '">' + window.SITE.email + '</a></p></div>' +
          '<div><h4>Service</h4><p>' + window.SITE.serviceArea + '<br>Minimum order ' +
            window.formatMoney(window.SITE.minOrder) + ' · ' + window.SITE.leadTimeDays + ' days’ lead time</p></div>' +
          '<div><h4>Explore</h4><p>' +
            '<a href="index.html#menu">Menu</a> · <a href="craft.html">The Craft</a><br>' +
            '<a href="about.html">About</a> · <a href="faq.html">FAQ</a> · <a href="gallery.html">Gallery</a><br>' +
            '<a href="admin.html">Back of house</a></p></div>' +
        '</div>' +
        '<div class="foot-mark" aria-hidden="true">SAKURA</div>' +
        '<div class="foot-legal">' +
          '<span>© ' + year + ' ' + window.SITE.name + '</span>' +
          '<span>Rolled at dawn · 朝に巻く</span>' +
          '<span>SF · 37.7749° N, 122.4194° W</span>' +
        '</div>';
    }

    // Fill [data-site] placeholders.
    Array.prototype.forEach.call(document.querySelectorAll("[data-site]"), function (el) {
      var key = el.getAttribute("data-site");
      if (window.SITE[key] !== undefined) {
        el.textContent = (key === "minOrder")
          ? window.formatMoney(window.SITE.minOrder)
          : window.SITE[key];
      }
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
