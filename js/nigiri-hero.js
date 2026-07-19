/* ============================================================================
 * Nigiri centrepiece (js/nigiri-hero.js)
 * ----------------------------------------------------------------------------
 * The #nigiri3d section used to be a tall, scroll-PINNED scrubber — the page
 * held still and scrolling drove the video frame-by-frame, which trapped the
 * reader until the whole clip had played. It now just plays: a normal-height
 * block that scrolls with the page while the muted clip auto-plays and loops.
 * Nothing blocks the scroll.
 *
 * Captions follow playback (not scroll); reduced-motion holds on the poster;
 * a load error swaps in the #n3-fallback still.
 * ==========================================================================*/
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CAPS = [
    ["鮨 — 01", "Three parts, apart."],
    ["鮨 — 02", "Coming together."],
    ["鮨 — 03", "One perfect bite."]
  ];

  function init() {
    var sec = document.getElementById("nigiri3d");
    if (!sec) return;
    var video = document.getElementById("n3-video");
    if (!video) return;

    video.addEventListener("error", function () {
      video.style.display = "none";
      var cap = document.getElementById("n3-caption"); if (cap) cap.hidden = true;
      var fb = document.getElementById("n3-fallback"); if (fb) fb.hidden = false;
    });

    video.muted = true; video.playsInline = true; video.loop = true;

    var stepEl = sec.querySelector("#n3-caption .n3-step");
    var lineEl = sec.querySelector("#n3-caption .n3-line");
    var lastCap = -1;
    function setCaption(i) {
      if (i === lastCap) return;
      lastCap = i;
      if (stepEl) stepEl.textContent = CAPS[i][0];
      if (lineEl) lineEl.textContent = CAPS[i][1];
    }
    setCaption(0);

    if (reduced) return;   // hold on the poster, no autoplay motion

    // Captions track playback position rather than scroll.
    video.addEventListener("timeupdate", function () {
      var d = video.duration || 9;
      var p = video.currentTime / d;
      setCaption(p < 0.34 ? 0 : p < 0.72 ? 1 : 2);
    });

    // Muted autoplay is allowed; if a browser still blocks it, kick it off on the
    // first user gesture. Pause while off-screen to save the decoder.
    function play() { var pr = video.play(); if (pr && pr.catch) pr.catch(function () {}); }
    try { video.load(); } catch (e) {}
    play();
    ["pointerdown", "touchstart", "wheel", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, play, { once: true, passive: true });
    });

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) play();
          else video.pause();
        });
      }, { threshold: 0.05 });
      io.observe(sec);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
