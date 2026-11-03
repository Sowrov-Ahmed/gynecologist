/* ============================================================
   about.js — Member 2
   Drives the scroll-filled rose spine of the "Credentials & Journey"
   timeline and lights up each milestone dot as the fill reaches it.
   ============================================================ */
(function () {
  'use strict';

  DrSite.register(function () {
    var timeline = document.querySelector('[data-js="about-timeline"]');
    var fill = document.querySelector('[data-js="about-timeline-fill"]');
    if (!timeline || !fill) { return; }

    var dots = Array.prototype.slice.call(timeline.querySelectorAll('[data-js="about-dot"]'));
    var visible = false;

    /* Toggle a milestone dot between idle and active colour. */
    function setDot(dot, on) {
      dot.classList.toggle('bg-rose', on);
      dot.classList.toggle('bg-paper', !on);
    }

    /* Reduced motion: spine fully filled, all dots active, no listeners. */
    if (DrSite.reduced) {
      fill.style.transform = 'scaleY(1)';
      dots.forEach(function (dot) { setDot(dot, true); });
      return;
    }

    /* Compute scroll progress through the timeline and apply it. */
    function update() {
      var rect = timeline.getBoundingClientRect();
      var trigger = window.innerHeight * 0.65;
      var progress = (trigger - rect.top) / rect.height;
      progress = Math.min(1, Math.max(0, progress));
      fill.style.transform = 'scaleY(' + progress.toFixed(4) + ')';

      dots.forEach(function (dot) {
        setDot(dot, dot.getBoundingClientRect().top < trigger);
      });
    }

    /* Only do work while the timeline is near the viewport. */
    var observer = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) { update(); }
    }, { rootMargin: '20% 0px 20% 0px' });
    observer.observe(timeline);

    DrSite.onScroll(function () {
      if (visible) { update(); }
    });
    window.addEventListener('resize', function () {
      if (visible) { update(); }
    }, { passive: true });

    update();
  });
})();
