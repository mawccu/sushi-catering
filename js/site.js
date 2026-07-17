/* ============================================================================
 * Shared site chrome (js/site.js)
 * ----------------------------------------------------------------------------
 * Injects a consistent nav + footer into any page that has:
 *   <header id="site-header"></header>  and  <footer id="site-footer"></footer>
 * and fills elements with [data-site="name|tagline|phone|email|serviceArea"].
 * Keep this simple — the polish pass owns visual styling.
 * ==========================================================================*/
(function () {
  var NAV = [
    { href: "index.html", label: "Home" },
    { href: "index.html#menu", label: "Menu" },
    { href: "index.html#builder", label: "Build a Quote" },
    { href: "about.html", label: "About" },
    { href: "faq.html", label: "FAQ" },
    { href: "gallery.html", label: "Gallery" },
    { href: "admin.html", label: "Admin" }
  ];

  function init() {
    var header = document.getElementById("site-header");
    if (header) {
      header.innerHTML =
        '<a class="brand" href="index.html">' + window.SITE.name + '</a>' +
        '<nav class="site-nav">' +
        NAV.map(function (n) { return '<a href="' + n.href + '">' + n.label + '</a>'; }).join("") +
        '</nav>';
    }
    var footer = document.getElementById("site-footer");
    if (footer) {
      footer.innerHTML =
        '<p><strong>' + window.SITE.name + '</strong> — ' + window.SITE.tagline + '</p>' +
        '<p>Phone: ' + window.SITE.phone + ' · Email: ' + window.SITE.email + '</p>' +
        '<p>Service area: ' + window.SITE.serviceArea + '</p>' +
        '<p><small>Minimum order ' + window.formatMoney(window.SITE.minOrder) +
        '. ' + window.SITE.leadTimeDays + ' days lead time required.</small></p>';
    }
    // Fill [data-site] placeholders.
    Array.prototype.forEach.call(document.querySelectorAll("[data-site]"), function (el) {
      var key = el.getAttribute("data-site");
      if (window.SITE[key] !== undefined) el.textContent = window.SITE[key];
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
