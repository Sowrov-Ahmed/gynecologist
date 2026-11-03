/* ============================================================
   services.js — Member 2
   Category filtering with fade/scale transitions, live result count,
   and the "Book this service" cross-section event.
   ============================================================ */
(function () {
  'use strict';

  DrSite.register(function () {
    var section = document.getElementById('services');
    if (!section) { return; }

    var buttons = Array.prototype.slice.call(section.querySelectorAll('[data-js="svc-filter"]'));
    var items = Array.prototype.slice.call(section.querySelectorAll('[data-js="svc-item"]'));
    var count = section.querySelector('[data-js="svc-count"]');
    var HIDE_DELAY = DrSite.reduced ? 0 : 300;
    var FADE_CLASSES = ['opacity-0', 'scale-95', 'pointer-events-none'];
    var timers = new Map();

    /* Fade a card in: un-hide the grid item, then remove the fade classes. */
    function showItem(item) {
      var fade = item.querySelector('[data-js="svc-fade"]');
      if (timers.has(item)) { clearTimeout(timers.get(item)); timers.delete(item); }
      item.classList.remove('hidden');
      void fade.offsetWidth; /* commit display change so the transition runs */
      FADE_CLASSES.forEach(function (c) { fade.classList.remove(c); });
    }

    /* Fade a card out, then remove it from layout once the transition ends. */
    function hideItem(item) {
      var fade = item.querySelector('[data-js="svc-fade"]');
      if (timers.has(item)) { clearTimeout(timers.get(item)); }
      FADE_CLASSES.forEach(function (c) { fade.classList.add(c); });
      timers.set(item, setTimeout(function () {
        item.classList.add('hidden');
        timers.delete(item);
      }, HIDE_DELAY));
    }

    /* Apply a category filter and announce the result. */
    function applyFilter(filter, label) {
      var shown = 0;
      items.forEach(function (item) {
        var match = filter === 'all' || item.getAttribute('data-category') === filter;
        if (match) { shown += 1; showItem(item); } else { hideItem(item); }
      });
      if (count) {
        count.textContent = 'Showing ' + shown + ' of ' + items.length + ' services' +
          (filter === 'all' ? '' : ' in ' + label);
      }
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', b === button ? 'true' : 'false'); });
        applyFilter(button.getAttribute('data-filter'), button.getAttribute('data-label'));
      });
    });

    /* "Book this service": announce the choice, then scroll to the form. */
    section.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-js="svc-book"]');
      if (!trigger) { return; }
      window.dispatchEvent(new CustomEvent('dr:select-service', {
        detail: { service: trigger.getAttribute('data-service') }
      }));
      var target = document.getElementById('appointment');
      if (target) {
        target.scrollIntoView({ behavior: DrSite.reduced ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });
})();
