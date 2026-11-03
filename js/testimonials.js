/* ==========================================================================
   js/testimonials.js — rating bars + draggable carousel (Member 4)
   Hooks: data-js="tst-*"  |  Depends on window.DrSite (core.js)
   ========================================================================== */
(function () {
  "use strict";

  DrSite.register(function () {
    var section = document.getElementById("testimonials");
    if (!section) return;

    /* ---------- Rating bars: animate in when visible ---------- */
    var barsWrap = section.querySelector('[data-js="tst-bars"]');
    var bars = section.querySelectorAll('[data-js="tst-bar"]');
    var barObserver = null;

    function fillBars() {
      Array.prototype.forEach.call(bars, function (bar) {
        bar.dataset.on = "true";
      });
    }

    if (barsWrap) {
      if (DrSite.reduced || !("IntersectionObserver" in window)) {
        fillBars();
      } else {
        barObserver = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) {
            fillBars();
            barObserver.disconnect();
          }
        }, { threshold: 0.35 });
        barObserver.observe(barsWrap);
      }
    }

    /* ---------- Carousel ---------- */
    var carousel = section.querySelector('[data-js="tst-carousel"]');
    var viewport = section.querySelector('[data-js="tst-viewport"]');
    var track = section.querySelector('[data-js="tst-track"]');
    if (!carousel || !viewport || !track) return;

    var prevBtn = carousel.querySelector('[data-js="tst-prev"]');
    var nextBtn = carousel.querySelector('[data-js="tst-next"]');
    var toggleBtn = carousel.querySelector('[data-js="tst-toggle"]');
    var toggleLabel = carousel.querySelector('[data-js="tst-toggle-label"]');
    var counter = carousel.querySelector('[data-js="tst-counter"]');
    var dots = Array.prototype.slice.call(carousel.querySelectorAll('[data-js="tst-dot"]'));
    var slides = Array.prototype.slice.call(track.children);
    var total = slides.length;

    var AUTOPLAY_MS = 6000;
    var index = 0;
    var width = viewport.clientWidth;
    var delta = 0;

    var pointerId = null;
    var startX = 0;
    var startTime = 0;
    var moved = false;

    var hovering = false;
    var focusing = false;
    var touching = false;
    var inView = true;
    var userStopped = false;
    var timer = null;
    var carouselObserver = null;
    var resizeObserver = null;

    function pad(n) {
      return n < 10 ? "0" + n : String(n);
    }

    function autoplayActive() {
      return !DrSite.reduced && !userStopped && !hovering && !focusing &&
        !touching && inView && !document.hidden;
    }

    /* Announce changes politely only when the user is in control */
    function syncLive() {
      track.setAttribute("aria-live", autoplayActive() ? "off" : "polite");
    }

    function render() {
      width = viewport.clientWidth;
      track.style.transform = "translateX(" + (-index * width + delta) + "px)";
    }

    function updateState() {
      slides.forEach(function (slide, i) {
        slide.setAttribute("aria-hidden", i === index ? "false" : "true");
      });
      dots.forEach(function (dot, i) {
        var active = i === index;
        if (active) {
          dot.setAttribute("aria-current", "true");
        } else {
          dot.removeAttribute("aria-current");
        }
        dot.firstElementChild.dataset.active = String(active);
      });
      if (counter) counter.textContent = pad(index + 1) + " / " + pad(total);
    }

    function restartTimer() {
      if (timer) window.clearInterval(timer);
      timer = null;
      if (DrSite.reduced) return;
      timer = window.setInterval(function () {
        if (autoplayActive()) goTo(index + 1, false);
      }, AUTOPLAY_MS);
    }

    function goTo(i, fromUser) {
      index = ((i % total) + total) % total;
      delta = 0;
      updateState();
      render();
      if (fromUser) restartTimer();
      syncLive();
    }

    /* ---------- Buttons ---------- */
    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(index - 1, true); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(index + 1, true); });
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { goTo(i, true); });
    });

    if (toggleBtn) {
      if (DrSite.reduced) {
        toggleBtn.classList.add("hidden");
      } else {
        toggleBtn.addEventListener("click", function () {
          userStopped = !userStopped;
          if (toggleLabel) toggleLabel.textContent = userStopped ? "Play" : "Pause";
          toggleBtn.setAttribute("aria-label", userStopped ? "Start automatic rotation" : "Pause automatic rotation");
          syncLive();
        });
      }
    }

    /* ---------- Keyboard ---------- */
    carousel.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1, true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1, true);
      } else if (e.key === "Home" && e.target === viewport) {
        e.preventDefault();
        goTo(0, true);
      } else if (e.key === "End" && e.target === viewport) {
        e.preventDefault();
        goTo(total - 1, true);
      }
    });

    /* ---------- Pause on hover / focus ---------- */
    carousel.addEventListener("mouseenter", function () { hovering = true; syncLive(); });
    carousel.addEventListener("mouseleave", function () { hovering = false; syncLive(); });
    carousel.addEventListener("focusin", function () { focusing = true; syncLive(); });
    carousel.addEventListener("focusout", function (e) {
      if (!carousel.contains(e.relatedTarget)) {
        focusing = false;
        syncLive();
      }
    });

    /* ---------- Pointer / touch drag with snap ---------- */
    function endDrag(e) {
      if (pointerId === null || e.pointerId !== pointerId) return;
      var dx = e.type === "pointercancel" ? delta : e.clientX - startX;

      if (moved) {
        var elapsed = Date.now() - startTime;
        var threshold = width * 0.18;
        var dir = 0;
        if (dx < -threshold || (dx < -30 && elapsed < 250)) dir = 1;
        else if (dx > threshold || (dx > 30 && elapsed < 250)) dir = -1;
        index = Math.min(total - 1, Math.max(0, index + dir));
      }

      if (viewport.hasPointerCapture && viewport.hasPointerCapture(pointerId)) {
        viewport.releasePointerCapture(pointerId);
      }
      pointerId = null;
      moved = false;
      delta = 0;
      track.dataset.drag = "false";
      touching = false;
      updateState();
      render();
      restartTimer();
      syncLive();
    }

    viewport.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startTime = Date.now();
      moved = false;
      touching = e.pointerType !== "mouse";
      syncLive();
    });

    viewport.addEventListener("pointermove", function (e) {
      if (pointerId === null || e.pointerId !== pointerId) return;
      var dx = e.clientX - startX;
      if (!moved) {
        if (Math.abs(dx) < 6) return;
        moved = true;
        track.dataset.drag = "true";
        viewport.setPointerCapture(pointerId);
      }
      /* Resist dragging past the first / last slide */
      if ((index === 0 && dx > 0) || (index === total - 1 && dx < 0)) dx *= 0.3;
      delta = dx;
      render();
    });

    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    /* ---------- Visibility, resize, lifecycle ---------- */
    if ("IntersectionObserver" in window) {
      carouselObserver = new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        syncLive();
      }, { threshold: 0.25 });
      carouselObserver.observe(carousel);
    }

    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(render);
      resizeObserver.observe(viewport);
    } else {
      window.addEventListener("resize", render, { passive: true });
    }

    document.addEventListener("visibilitychange", syncLive);

    window.addEventListener("pagehide", function () {
      if (timer) window.clearInterval(timer);
      if (carouselObserver) carouselObserver.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      if (barObserver) barObserver.disconnect();
    });

    /* ---------- Init ---------- */
    updateState();
    render();
    syncLive();
    restartTimer();
  });
})();
