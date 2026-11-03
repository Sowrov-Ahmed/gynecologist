(function () {
  'use strict';

  /* ===== DrSite: shared Motion API ===== */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var queue = [];
  var ready = false;
  var scrollFns = [];
  var scrollTick = false;
  var seen = new WeakSet();
  var parallaxItems = [];
  var counterRunners = new WeakMap();
  var vh = window.innerHeight;

  window.DrSite = {
    reduced: reduced,
    register: function (fn) {
      if (ready) { fn(); } else { queue.push(fn); }
    },
    onScroll: function (fn) { scrollFns.push(fn); }
  };

  /* ===== rAF-throttled scroll dispatcher ===== */
  function flushScroll() {
    scrollTick = false;
    var y = window.scrollY;
    for (var i = 0; i < scrollFns.length; i++) { scrollFns[i](y); }
  }
  window.addEventListener('scroll', function () {
    if (!scrollTick) {
      scrollTick = true;
      window.requestAnimationFrame(flushScroll);
    }
  }, { passive: true });

  function toggleClasses(el, op, list) {
    el.classList[op].apply(el.classList, list.split(' '));
  }

  /* ===== data-reveal ===== */
  var HIDDEN = {
    up: 'opacity-0 translate-y-8',
    down: 'opacity-0 -translate-y-8',
    left: 'opacity-0 -translate-x-8',
    right: 'opacity-0 translate-x-8',
    zoom: 'opacity-0 scale-90',
    fade: 'opacity-0'
  };
  var MOTION = 'transition-[opacity,transform] duration-700 ease-out';

  var revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) { return; }
          revealObserver.unobserve(entry.target);
          showReveal(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    : null;

  function showReveal(el) {
    var hidden = HIDDEN[el.getAttribute('data-reveal')] || HIDDEN.fade;
    var delay = parseInt(el.getAttribute('data-delay'), 10) || 0;
    window.setTimeout(function () {
      toggleClasses(el, 'remove', hidden);
      el.classList.add('opacity-100');
      window.setTimeout(function () { toggleClasses(el, 'remove', MOTION); }, 800);
    }, delay);
  }

  function initReveal(el) {
    if (reduced || !revealObserver) { return; }
    toggleClasses(el, 'add', MOTION + ' ' + (HIDDEN[el.getAttribute('data-reveal')] || HIDDEN.fade));
    revealObserver.observe(el);
  }

  /* ===== data-parallax / data-parallax-x ===== */
  function initParallax(el) {
    if (reduced) { return; }
    parallaxItems.push({
      el: el,
      sy: parseFloat(el.getAttribute('data-parallax')) || 0,
      sx: parseFloat(el.getAttribute('data-parallax-x')) || 0,
      y: 0,
      x: 0
    });
  }

  function updateParallax() {
    for (var i = 0; i < parallaxItems.length; i++) {
      var it = parallaxItems[i];
      var r = it.el.getBoundingClientRect();
      var baseTop = r.top - it.y;
      if (baseTop > vh * 1.5 || baseTop + r.height < -vh * 0.5) { continue; }
      var dist = baseTop + r.height / 2 - vh / 2;
      it.y = -dist * it.sy;
      it.x = -dist * it.sx;
      it.el.style.transform = 'translate3d(' + it.x.toFixed(1) + 'px,' + it.y.toFixed(1) + 'px,0)';
    }
  }

  /* ===== data-counter ===== */
  var counterObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) { return; }
          counterObserver.unobserve(entry.target);
          var run = counterRunners.get(entry.target);
          if (run) { run(); }
        });
      }, { threshold: 0.4 })
    : null;

  function initCounter(el) {
    var raw = el.getAttribute('data-counter');
    var target = parseFloat(raw);
    if (isNaN(target)) { return; }
    var decimals = (raw.split('.')[1] || '').length;
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';

    function render(v) {
      el.textContent = prefix + v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    }
    if (reduced || !counterObserver) { render(target); return; }

    render(0);
    counterRunners.set(el, function () {
      var start = null;
      var duration = 1800;
      function step(ts) {
        if (start === null) { start = ts; }
        var p = Math.min((ts - start) / duration, 1);
        render(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) { window.requestAnimationFrame(step); }
      }
      window.requestAnimationFrame(step);
    });
    counterObserver.observe(el);
  }

  /* ===== DOM scan (idempotent; runs at init and again on window load) ===== */
  function scan() {
    document.querySelectorAll('[data-reveal],[data-parallax],[data-parallax-x],[data-counter]').forEach(function (el) {
      if (seen.has(el)) { return; }
      seen.add(el);
      if (el.hasAttribute('data-reveal')) { initReveal(el); }
      if (el.hasAttribute('data-parallax') || el.hasAttribute('data-parallax-x')) { initParallax(el); }
      if (el.hasAttribute('data-counter')) { initCounter(el); }
    });
    updateParallax();
  }

  function init() {
    scan();
    ready = true;
    queue.splice(0).forEach(function (fn) { fn(); });
    window.DrSite.onScroll(updateParallax);
    window.addEventListener('resize', function () { vh = window.innerHeight; updateParallax(); }, { passive: true });
    window.addEventListener('load', scan);
  }

  if (document.readyState === 'complete') { init(); } else { document.addEventListener('DOMContentLoaded', init); }
})();