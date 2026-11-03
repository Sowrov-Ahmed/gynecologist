(function () {
  'use strict';

  DrSite.register(function () {
    var $ = function (s) { return document.querySelector(s); };
    var header = $('#site-header');
    var menu = $('#nav-menu');
    var menuBtn = $('#nav-menu-btn');
    var menuClose = $('#nav-menu-close');
    var bar = $('#nav-progress');
    var floatCta = $('#nav-float-cta');
    var topBtn = $('#nav-top');
    var hero = $('#home');
    var appt = $('#appointment');
    var behavior = DrSite.reduced ? 'auto' : 'smooth';
    var lastY = 0;
    var apptVisible = false;
    var menuOpen = false;
    var lastFocus = null;

    var SOLID = 'bg-paper border-ink';
    var CLEAR = 'bg-transparent border-transparent';
    var SHOWN = 'visible opacity-100 translate-y-0';
    var HIDDEN = 'invisible opacity-0 translate-y-4';

    function toggleClasses(el, op, list) {
      el.classList[op].apply(el.classList, list.split(' '));
    }
    function setState(el, on, off, flag) {
      toggleClasses(el, 'remove', flag ? off : on);
      toggleClasses(el, 'add', flag ? on : off);
    }

    /* ===== Scroll-driven UI: progress, navbar, floating widgets ===== */
    function update(y) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
      setState(header, SOLID, CLEAR, y > 24);

      if (y > 160 && y > lastY + 4 && !menuOpen && !header.contains(document.activeElement)) {
        header.classList.add('-translate-y-full');
      } else if (y < lastY - 4 || y <= 160) {
        header.classList.remove('-translate-y-full');
      }
      lastY = y;

      setState(floatCta, SHOWN, HIDDEN, hero && y > hero.offsetHeight * 0.8 && !apptVisible);
      setState(topBtn, SHOWN, HIDDEN, y > 600);
    }

    if (appt && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        apptVisible = entries[0].isIntersecting;
        update(window.scrollY);
      }).observe(appt);
    }
    DrSite.onScroll(update);
    update(window.scrollY);

    /* ===== Scrollspy ===== */
    var spyLinks = document.querySelectorAll('[data-js="nav-link"],[data-js="nav-mobile-link"]');
    function setCurrent(id) {
      spyLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) { a.setAttribute('aria-current', 'true'); }
        else { a.removeAttribute('aria-current'); }
      });
    }
    if ('IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { setCurrent(e.target.id); } });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      ['home', 'about', 'services', 'chambers', 'appointment', 'testimonials', 'faqs', 'contact'].forEach(function (id) {
        var s = document.getElementById(id);
        if (s) { spy.observe(s); }
      });
    }

    /* ===== Mobile menu ===== */
    var OPEN = 'visible opacity-100 translate-y-0';
    var SHUT = 'invisible opacity-0 -translate-y-4';

    function focusables() {
      return menu.querySelectorAll('a[href],button:not([disabled])');
    }
    function openMenu() {
      menuOpen = true;
      lastFocus = document.activeElement;
      menu.inert = false;
      setState(menu, OPEN, SHUT, true);
      menuBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('overflow-hidden');
      menuClose.focus();
    }
    function closeMenu(restoreFocus) {
      if (!menuOpen) { return; }
      menuOpen = false;
      setState(menu, OPEN, SHUT, false);
      menu.inert = true;
      menuBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('overflow-hidden');
      if (restoreFocus && lastFocus) { lastFocus.focus(); }
    }
    menuBtn.addEventListener('click', function () { if (menuOpen) { closeMenu(true); } else { openMenu(); } });
    menuClose.addEventListener('click', function () { closeMenu(true); });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a[href^="#"]')) { closeMenu(false); }
    });
    document.addEventListener('keydown', function (e) {
      if (!menuOpen) { return; }
      if (e.key === 'Escape') { closeMenu(true); return; }
      if (e.key !== 'Tab') { return; }
      var f = focusables();
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) {
      if (e.matches) { closeMenu(false); }
    });

    /* ===== Smooth in-page anchors ===== */
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) { return; }
      var a = e.target.closest('a[href^="#"]');
      if (!a) { return; }
      var id = a.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) { return; }
      e.preventDefault();
      target.scrollIntoView({ behavior: behavior, block: 'start' });
      if (window.history.replaceState) { window.history.replaceState(null, '', '#' + id); }
    });

    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: behavior });
    });
  });
})();