/* ==========================================================================
   js/faqs.js — accordion, live search, category filters (Member 4)
   Hooks: data-js="faq-*"  |  Depends on window.DrSite (core.js)
   ========================================================================== */
(function () {
  "use strict";

  DrSite.register(function () {
    var section = document.getElementById("faqs");
    if (!section) return;

    var input = section.querySelector('[data-js="faq-search"]');
    var status = section.querySelector('[data-js="faq-status"]');
    var empty = section.querySelector('[data-js="faq-empty"]');
    var resetBtn = section.querySelector('[data-js="faq-reset"]');
    var tabs = Array.prototype.slice.call(section.querySelectorAll('[data-js="faq-tab"]'));
    var items = Array.prototype.slice.call(section.querySelectorAll('[data-js="faq-item"]'));
    if (!items.length) return;

    var total = items.length;
    var category = "all";
    var query = "";

    /* Searchable text, captured once */
    var texts = items.map(function (item) {
      return item.textContent.replace(/\s+/g, " ").toLowerCase();
    });

    function buttonOf(item) {
      return item.querySelector('[data-js="faq-q"]');
    }

    function panelOf(item) {
      return item.querySelector('[data-js="faq-a"]');
    }

    /* ---------- Accordion ---------- */
    function setOpen(item, open) {
      var panel = panelOf(item);
      item.dataset.open = String(open);
      panel.dataset.open = String(open);
      buttonOf(item).setAttribute("aria-expanded", String(open));
      /* Closed panels must not be reachable by keyboard or screen reader */
      if (open) {
        panel.removeAttribute("inert");
      } else {
        panel.setAttribute("inert", "");
      }
    }

    function visibleButtons() {
      return items
        .filter(function (item) { return !item.classList.contains("hidden"); })
        .map(buttonOf);
    }

    function onKeydown(e) {
      var buttons = visibleButtons();
      var current = buttons.indexOf(e.currentTarget);
      var target = -1;

      if (e.key === "ArrowDown") target = (current + 1) % buttons.length;
      else if (e.key === "ArrowUp") target = (current - 1 + buttons.length) % buttons.length;
      else if (e.key === "Home") target = 0;
      else if (e.key === "End") target = buttons.length - 1;

      if (target > -1) {
        e.preventDefault();
        buttons[target].focus();
      }
    }

    items.forEach(function (item) {
      setOpen(item, item.dataset.open === "true");

      buttonOf(item).addEventListener("click", function () {
        var willOpen = item.dataset.open !== "true";
        items.forEach(function (other) {
          if (other !== item && other.dataset.open === "true") setOpen(other, false);
        });
        setOpen(item, willOpen);
      });

      buttonOf(item).addEventListener("keydown", onKeydown);
    });

    /* ---------- Filtering ---------- */
    function applyFilter() {
      var q = query.trim().toLowerCase();
      var shown = 0;

      items.forEach(function (item, i) {
        var match = (category === "all" || item.dataset.cat === category) &&
          (q === "" || texts[i].indexOf(q) !== -1);
        item.classList.toggle("hidden", !match);
        if (match) {
          shown += 1;
        } else if (item.dataset.open === "true") {
          setOpen(item, false);
        }
      });

      if (empty) empty.classList.toggle("hidden", shown !== 0);

      if (status) {
        if (shown === 0) status.textContent = "No questions found.";
        else if (shown === total) status.textContent = "Showing all " + total + " questions.";
        else status.textContent = "Showing " + shown + " of " + total + " questions.";
      }
    }

    function setCategory(value) {
      category = value;
      tabs.forEach(function (tab) {
        tab.setAttribute("aria-pressed", String(tab.dataset.cat === value));
      });
      applyFilter();
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { setCategory(tab.dataset.cat); });
    });

    if (input) {
      input.addEventListener("input", function () {
        query = input.value;
        applyFilter();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (input) {
          input.value = "";
          input.focus();
        }
        query = "";
        setCategory("all");
      });
    }
  });
})();
