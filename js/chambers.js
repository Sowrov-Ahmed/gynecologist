/* ============================================================
   Chambers (04) | prefix: ch- | owner: Member 3
   Tabs, live open status, today highlight, booking hand-off
   ============================================================ */
(function () {
  'use strict';

  DrSite.register(function () {
    var root = document.getElementById('chambers');
    if (!root) { return; }

    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-js="ch-tab"]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[data-js="ch-panel"]'));
    if (!tabs.length || tabs.length !== panels.length) { return; }

    /* ---------- Constants ---------- */
    var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var TAB_ON = ['bg-ink', 'text-paper', 'shadow-brut-rose'];
    var TAB_OFF = ['bg-white', 'text-ink', 'shadow-brut-sm', 'hover:bg-apricot'];
    var ROW_ON = ['bg-ink', 'text-paper'];
    var BADGES = ['bg-mint', 'bg-apricot', 'bg-bone'];
    var DOTS = ['bg-emerald-700', 'bg-plum', 'bg-ink'];
    var RINGS = ['bg-emerald-600', 'bg-plum', 'bg-ink'];
    var TONES = {
      open: { badge: 'bg-mint', dot: 'bg-emerald-700', ring: 'bg-emerald-600', pulse: true },
      soon: { badge: 'bg-apricot', dot: 'bg-plum', ring: 'bg-plum', pulse: true },
      closed: { badge: 'bg-bone', dot: 'bg-ink', ring: 'bg-ink', pulse: false }
    };

    var active = 0;
    var timer = null;

    /* ---------- Time helpers ---------- */
    function parseTime(value) {
      var parts = value.split(':');
      return (Number(parts[0]) * 60) + Number(parts[1]);
    }

    function fmt(minutes) {
      var h = Math.floor(minutes / 60);
      var m = minutes % 60;
      var suffix = h >= 12 ? 'PM' : 'AM';
      var h12 = h % 12 || 12;
      return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + suffix;
    }

    /* ---------- Chamber configuration read from the markup ---------- */
    var configs = panels.map(function (panel) {
      return {
        days: panel.getAttribute('data-days').split(',').map(Number),
        open: parseTime(panel.getAttribute('data-open')),
        close: parseTime(panel.getAttribute('data-close'))
      };
    });

    /* ---------- Open / closed status ---------- */
    function nextOpening(cfg, today) {
      var i;
      var day;
      for (i = 1; i <= 7; i += 1) {
        day = (today + i) % 7;
        if (cfg.days.indexOf(day) > -1) {
          return (i === 1 ? 'tomorrow' : DAY_NAMES[day]) + ' ' + fmt(cfg.open);
        }
      }
      return '';
    }

    function statusFor(cfg, now) {
      var day = now.getDay();
      var minutes = (now.getHours() * 60) + now.getMinutes();
      var openToday = cfg.days.indexOf(day) > -1;
      var next;

      if (openToday && minutes >= cfg.open && minutes < cfg.close) {
        return { tone: 'open', text: 'Open now · until ' + fmt(cfg.close), tab: 'Open now' };
      }
      if (openToday && minutes < cfg.open) {
        return { tone: 'soon', text: 'Opens at ' + fmt(cfg.open) + ' today', tab: 'Opens ' + fmt(cfg.open) };
      }
      next = nextOpening(cfg, day);
      return { tone: 'closed', text: 'Closed today' + (next ? ' · next ' + next : ''), tab: 'Closed today' };
    }

    function swapClass(el, remove, add) {
      remove.forEach(function (c) { el.classList.remove(c); });
      el.classList.add(add);
    }

    function applyStatus(panel, status) {
      var tone = TONES[status.tone];
      var badge = panel.querySelector('[data-js="ch-status"]');
      var ring = panel.querySelector('[data-js="ch-status-ring"]');
      var dot = panel.querySelector('[data-js="ch-status-dot"]');
      var label = panel.querySelector('[data-js="ch-status-text"]');

      swapClass(badge, BADGES, tone.badge);
      swapClass(dot, DOTS, tone.dot);
      swapClass(ring, RINGS, tone.ring);
      ring.classList.toggle('invisible', !tone.pulse);
      if (label.textContent !== status.text) { label.textContent = status.text; }
    }

    function highlightToday(panel, day) {
      var rows = panel.querySelectorAll('[data-js="ch-row"]');
      Array.prototype.forEach.call(rows, function (row) {
        var isToday = Number(row.getAttribute('data-day')) === day;
        var chip = row.querySelector('[data-js="ch-today-chip"]');
        ROW_ON.forEach(function (c) { row.classList.toggle(c, isToday); });
        if (chip) { chip.classList.toggle('hidden', !isToday); }
        if (isToday) {
          row.setAttribute('aria-current', 'date');
        } else {
          row.removeAttribute('aria-current');
        }
      });
    }

    function updateAll() {
      var now = new Date();
      panels.forEach(function (panel, i) {
        var status = statusFor(configs[i], now);
        var tabStatus = tabs[i].querySelector('[data-js="ch-tab-status"]');
        applyStatus(panel, status);
        highlightToday(panel, now.getDay());
        if (tabStatus && tabStatus.textContent !== status.tab) { tabStatus.textContent = status.tab; }
      });
    }

    /* ---------- Tabs ---------- */
    function showPanel(panel) {
      panel.hidden = false;
      if (DrSite.reduced) { return; }
      panel.classList.add('opacity-0', 'translate-y-4', 'lg:translate-y-0', 'lg:translate-x-6');
      void panel.offsetWidth;
      panel.classList.remove('opacity-0', 'translate-y-4', 'lg:translate-y-0', 'lg:translate-x-6');
    }

    function selectTab(index, moveFocus) {
      if (index === active) {
        if (moveFocus) { tabs[index].focus(); }
        return;
      }
      tabs.forEach(function (tab, i) {
        var selected = i === index;
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        tab.tabIndex = selected ? 0 : -1;
        TAB_ON.forEach(function (c) { tab.classList.toggle(c, selected); });
        TAB_OFF.forEach(function (c) { tab.classList.toggle(c, !selected); });
      });
      panels.forEach(function (panel, i) {
        if (i === index) {
          showPanel(panel);
        } else {
          panel.hidden = true;
        }
      });
      active = index;
      if (moveFocus) { tabs[index].focus(); }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectTab(i, false); });
    });

    root.querySelector('[data-js="ch-tablist"]').addEventListener('keydown', function (event) {
      var last = tabs.length - 1;
      var target = null;
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          target = active === last ? 0 : active + 1;
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          target = active === 0 ? last : active - 1;
          break;
        case 'Home':
          target = 0;
          break;
        case 'End':
          target = last;
          break;
        default:
          return;
      }
      event.preventDefault();
      selectTab(target, true);
    });

    /* ---------- Booking hand-off ---------- */
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-js="ch-book"]');
      var target;
      if (!button) { return; }
      window.dispatchEvent(new CustomEvent('dr:select-chamber', {
        detail: { chamber: button.getAttribute('data-chamber') }
      }));
      target = document.getElementById('appointment');
      if (target) {
        target.scrollIntoView({ behavior: DrSite.reduced ? 'auto' : 'smooth', block: 'start' });
      }
    });

    /* ---------- Live clock refresh ---------- */
    updateAll();
    timer = window.setInterval(updateAll, 30000);

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { updateAll(); }
    });

    window.addEventListener('pagehide', function () {
      window.clearInterval(timer);
    });
  });
})();
