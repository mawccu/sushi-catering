/* ============================================================================
 * Hero scroll-scrub (js/nigiri-hero.js)
 * ----------------------------------------------------------------------------
 * The #nigiri3d hero: a cinematic sushi film scrubbed by scroll. The section is
 * tall (see CSS height:340vh) with a position:sticky pin, so the video holds
 * still while you scroll through the section. Progress is read every frame
 * straight from the section's getBoundingClientRect · NO ScrollTrigger, no GSAP
 * pin, which is the most reliable way to tie playback to scroll. currentTime is
 * eased toward the target for a smooth scrub; the MP4 is all-keyframe so seeking
 * is frame-accurate.
 *
 * The video is primed with a muted play()->pause() on the first scroll/gesture
 * so the browser will render seeked frames (some browsers won't until it has
 * played once). Reduced-motion / load failure => poster or #n3-fallback.
 * ==========================================================================*/
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

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

    video.muted = true; video.playsInline = true;
    try { video.load(); } catch (e) {}

    // prime so the browser decodes/renders seeked frames
    var primed = false;
    function prime() {
      if (primed) return; primed = true;
      var p = video.play();
      if (p && p.then) p.then(function () { video.pause(); }).catch(function () {});
      else { try { video.pause(); } catch (e) {} }
    }
    video.addEventListener("canplay", prime, { once: true });
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("wheel", prime, { once: true, passive: true });
    window.addEventListener("touchstart", prime, { once: true, passive: true });
    window.addEventListener("keydown", prime, { once: true });

    var CAPS = [
      ["Step 01", "It starts with warm, seasoned rice."],
      ["Step 02", "The fish is sliced and laid by hand."],
      ["Step 03", "Pressed, brushed, ready to serve."]
    ];
    var stepEl = sec.querySelector("#n3-caption .n3-step");
    var lineEl = sec.querySelector("#n3-caption .n3-line");
    var lastCap = -1;
    function setCaption(p) {
      var i = p < 0.34 ? 0 : p < 0.72 ? 1 : 2;
      if (i === lastCap) return;
      lastCap = i;
      if (stepEl) stepEl.textContent = CAPS[i][0];
      if (lineEl) lineEl.textContent = CAPS[i][1];
    }

    var duration = 0, ready = false;
    function onMeta() { duration = video.duration || 8; ready = true; }
    if (video.readyState >= 1) onMeta();
    else video.addEventListener("loadedmetadata", onMeta);

    if (reduced) { setCaption(0); return; }   // hold on poster

    var cur = 0, seeking = false, lastFrame = -1;
    var FPS = 60;   // clip is motion-interpolated to 60 fps, all-keyframe (see assets encode)
    video.addEventListener("seeking", function () { seeking = true; });
    video.addEventListener("seeked", function () { seeking = false; });

    function progress() {
      var rect = sec.getBoundingClientRect();
      var total = sec.offsetHeight - window.innerHeight;
      if (total <= 0) return 0;
      return clamp(-rect.top / total, 0, 1);
    }

    // Safety net: if scrubbing never actually moves the frame (some browsers
    // won't render seeks), fall back to plain looping playback so it still moves.
    var stuckFrames = 0, fellBack = false;
    function fallbackToPlay() {
      if (fellBack) return;
      fellBack = true;
      video.loop = true;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }

    function tick() {
      requestAnimationFrame(tick);
      if (!ready || !duration) return;
      var p = progress();
      setCaption(p);
      if (fellBack) return;   // playback owns the video now
      var target = p * duration;
      // Ease the playhead toward the scroll target. Lenis already smooths the
      // scroll, so a light lerp here just removes the last micro-jitter.
      cur += (target - cur) * 0.18;
      if (Math.abs(target - cur) < 0.0005) cur = target;
      if (!seeking && video.readyState >= 2) {
        var want = clamp(cur, 0, duration - 0.001);
        // The clip is all-keyframe, so seeks are cheap. Snap to the NEAREST real
        // frame and only seek when that frame index actually changes: exactly one
        // decode per displayed frame, landed mid-frame so the picture is crisp —
        // no redundant re-decodes of the same frame, no back-and-forth jitter.
        var frame = Math.round(want * FPS);
        if (frame !== lastFrame) {
          try { video.currentTime = (frame + 0.5) / FPS; lastFrame = frame; } catch (e) {}
        }
      }
      // detect "asked to scrub well past the start but frame is still at 0"
      if (target > 0.7 && video.currentTime < 0.12) {
        if (++stuckFrames > 150) fallbackToPlay();   // ~2.5s of no effect
      } else {
        stuckFrames = 0;
      }
    }
    tick();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
