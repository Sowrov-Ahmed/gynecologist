/* ==========================================================================
   js/contact.js — message form validation, counter, WhatsApp/email hand-off
   Hooks: data-js="ctc-*"  |  Depends on window.DrSite (core.js)
   Frontend only: nothing is sent by the site; the visitor chooses a channel.
   ========================================================================== */
(function () {
  "use strict";

  DrSite.register(function () {
    var form = document.getElementById("ctc-form");
    if (!form) return;

    var WA_NUMBER = "8801711482905";
    var EMAIL = "care@drtahminarahman.com";
    var MAX = 500;

    var summary = document.getElementById("ctc-error-summary");
    var summaryList = document.getElementById("ctc-error-list");
    var counter = document.getElementById("ctc-count");
    var countStatus = document.getElementById("ctc-count-status");
    var success = document.getElementById("ctc-success");
    var successTitle = document.getElementById("ctc-success-title");
    var waLink = success.querySelector('[data-js="ctc-wa-link"]');
    var mailLink = success.querySelector('[data-js="ctc-mail-link"]');
    var editBtn = success.querySelector('[data-js="ctc-edit"]');
    var resetBtn = success.querySelector('[data-js="ctc-reset"]');

    var order = ["name", "mobile", "email", "topic", "message", "consent"];
    var fields = {};
    var errorEls = {};
    order.forEach(function (key) {
      fields[key] = document.getElementById("ctc-" + key);
      errorEls[key] = document.getElementById("ctc-" + key + "-error");
    });

    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var mobilePattern = /^(?:\+?88)?01[3-9]\d{8}$/;

    /* ---------- Validation ---------- */
    var validators = {
      name: function () {
        var v = fields.name.value.trim();
        if (!v) return "Please enter your full name.";
        if (v.length < 2) return "Your name needs at least 2 characters.";
        return "";
      },
      mobile: function () {
        var v = fields.mobile.value.replace(/[\s\-()]/g, "");
        if (!v) return "Please enter your mobile number.";
        if (!mobilePattern.test(v)) return "Enter a valid Bangladesh mobile number, for example 01711-482905.";
        return "";
      },
      email: function () {
        var v = fields.email.value.trim();
        if (v && !emailPattern.test(v)) return "Enter a valid email address, or leave this field empty.";
        return "";
      },
      topic: function () {
        return fields.topic.value ? "" : "Please choose a topic.";
      },
      message: function () {
        var v = fields.message.value.trim();
        if (!v) return "Please write your message.";
        if (v.length < 10) return "Your message needs at least 10 characters.";
        return "";
      },
      consent: function () {
        return fields.consent.checked ? "" : "Please tick the box to agree before continuing.";
      }
    };

    var labels = {
      name: "Full name",
      mobile: "Mobile number",
      email: "Email",
      topic: "Topic",
      message: "Message",
      consent: "Consent"
    };

    function setError(key, message) {
      var field = fields[key];
      var el = errorEls[key];
      if (message) {
        el.textContent = message;
        el.classList.remove("hidden");
        field.setAttribute("aria-invalid", "true");
      } else {
        el.textContent = "";
        el.classList.add("hidden");
        field.removeAttribute("aria-invalid");
      }
    }

    order.forEach(function (key) {
      var field = fields[key];
      var eventName = key === "topic" || key === "consent" ? "change" : "blur";
      field.addEventListener(eventName, function () {
        setError(key, validators[key]());
      });
      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") setError(key, validators[key]());
      });
    });

    /* ---------- Character counter ---------- */
    function updateCounter() {
      var length = fields.message.value.length;
      var remaining = MAX - length;
      counter.textContent = length + " / " + MAX;
      counter.classList.toggle("font-bold", remaining <= 50);
      counter.classList.toggle("text-plum", remaining <= 50);
      counter.classList.toggle("text-ink/70", remaining > 50);
      if (remaining === 50 || remaining === 10 || remaining === 0) {
        countStatus.textContent = remaining + " characters remaining.";
      } else if (remaining > 50) {
        countStatus.textContent = "";
      }
    }

    fields.message.addEventListener("input", updateCounter);

    /* ---------- Error summary ---------- */
    function showSummary(errors) {
      summaryList.textContent = "";
      errors.forEach(function (item) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#ctc-" + item.key;
        a.className = "underline decoration-2 underline-offset-2 hover:text-plum focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-rose";
        a.textContent = labels[item.key] + ": " + item.message;
        a.addEventListener("click", function (e) {
          e.preventDefault();
          fields[item.key].focus();
        });
        li.appendChild(a);
        summaryList.appendChild(li);
      });
      summary.classList.remove("hidden");
      summary.focus();
    }

    /* ---------- Hand-off links ---------- */
    function buildLinks() {
      var name = fields.name.value.trim();
      var mobile = fields.mobile.value.trim();
      var email = fields.email.value.trim();
      var topic = fields.topic.value;
      var message = fields.message.value.trim();

      var lines = ["Hello, my name is " + name + ".", "Mobile: " + mobile];
      if (email) lines.push("Email: " + email);
      lines.push("Topic: " + topic, "", message);

      waLink.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
      mailLink.href = "mailto:" + EMAIL +
        "?subject=" + encodeURIComponent("Message about " + topic + " from " + name) +
        "&body=" + encodeURIComponent(lines.join("\r\n") + "\r\n\r\nThank you.");
    }

    /* ---------- Panels ---------- */
    function showSuccess() {
      form.classList.add("hidden");
      success.classList.remove("hidden");
      if (DrSite.reduced) {
        success.dataset.show = "true";
      } else {
        void success.offsetWidth; /* commit hidden state so the transition runs */
        success.dataset.show = "true";
      }
      successTitle.focus();
    }

    function showForm() {
      success.dataset.show = "false";
      success.classList.add("hidden");
      form.classList.remove("hidden");
    }

    /* ---------- Events ---------- */
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var errors = [];

      order.forEach(function (key) {
        var message = validators[key]();
        setError(key, message);
        if (message) errors.push({ key: key, message: message });
      });

      if (errors.length) {
        showSummary(errors);
        return;
      }

      summary.classList.add("hidden");
      buildLinks();
      showSuccess();
    });

    editBtn.addEventListener("click", function () {
      showForm();
      fields.message.focus();
    });

    resetBtn.addEventListener("click", function () {
      form.reset();
      order.forEach(function (key) { setError(key, ""); });
      summary.classList.add("hidden");
      updateCounter();
      showForm();
      fields.name.focus();
    });

    updateCounter();
  });
})();
