# Sakura Sushi Catering

Static website for a fictional sushi catering business, served via GitHub Pages
at https://mawccu.github.io/sushi-catering/ — plain HTML/CSS/JS, no build step.

## Pages
- `index.html` — hero, menu display, live quote builder, booking/quote form, testimonials
- `admin.html` — owner view: list/confirm/delete quote requests; edit menu prices
- `about.html`, `faq.html`, `gallery.html` — content pages

## Data model & JS (see file-top comments for full schemas)
- `js/config.js` — SINGLE SOURCE OF TRUTH: `SITE`, `MENU` (packages/platters/rolls/addons),
  `MENU_FLAT`, `PRICING_TIERS`. Menu item shape: `{id,name,desc,price,unit,category,serves,pieces,tags[]}`.
- `js/store.js` — `Store`: localStorage layer. Keys: `sakura_requests` (Request[]),
  `sakura_price_overrides` ({itemId:price}). Request schema documented in-file.
- `js/menu.js` — `getMenu()/getMenuFlat()/getItem()/formatMoney()/recommendPlatters()/estimatePackage()`.
  Always read prices via `getMenu()` so admin overrides apply.
- `js/builder.js` — `Builder`: quote-builder cart + booking form validation/submit.
- `js/menu-display.js` — read-only menu rendering.
- `js/site.js` — shared nav/footer injection + `[data-site]` placeholders.
- `js/admin.js` — admin requests list + price editor.
- `css/style.css` — deliberately minimal base styles (polish pass owns visual design).
