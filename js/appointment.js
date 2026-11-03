/* ============================================================
   Appointment (05) | prefix: apt- | owner: Member 3
   Three-step booking form. Frontend only: no storage, no network.
   ============================================================ */
(function () {
  'use strict';

  DrSite.register(function () {
    var root = document.getElementById('appointment');
    if (!root) { return; }

    function $(id) { return document.getElementById(id); }

    /* ---------- Reference data ---------- */
    var CHAMBERS = {
      "Shifa Women's Care Hospital": {
        days: [6, 0, 1, 2, 3, 4],
        open: 960,
        close: 1260,
        fees: { 'new': 1500, follow: 1000 },
        notes: {
          'new': 'Standard fee for a first consultation. Payable at the chamber.',
          follow: 'Follow-up fee applies within 30 days of your last visit.'
        },
        address: 'House 14, Road 27, Dhanmondi, Dhaka 1209'
      },
      'Padma Specialized Clinic': {
        days: [5],
        open: 540,
        close: 840,
        fees: { 'new': 1000, follow: 700 },
        notes: {
          'new': 'Standard fee for a first consultation. Payable at the chamber.',
          follow: 'Reduced fee for returning patients. Payable at the chamber.'
        },
        address: 'Goalchamot, Faridpur Sadar, Faridpur 7800'
      },
      'Online Video Consultation': {
        days: [6, 0, 1, 2, 3, 4],
        open: 600,
        close: 720,
        fees: { 'new': 1200, follow: 1200 },
        notes: {
          'new': 'One flat fee for new and follow-up video consultations. Payment details arrive with your secure link.',
          follow: 'One flat fee for new and follow-up video consultations. Payment details arrive with your secure link.'
        },
        address: 'Online video consultation (secure link shared after booking)'
      }
    };

    var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var STEP_NAMES = ['Your details', 'Choose slot', 'Review & confirm'];
    var PROGRESS = { 1: 'w-1/3', 2: 'w-2/3', 3: 'w-full' };
    var FIELD_KEYS = { 1: ['name', 'phone', 'age', 'email'], 2: ['chamber', 'reason', 'date', 'time'], 3: ['consent'] };
    var ORDER = ['name', 'phone', 'age', 'email', 'chamber', 'reason', 'date', 'time', 'consent'];
    var PHONE_RE = /^(?:\+?88)?01[3-9]\d{8}$/;
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var NAME_RE = /^[\p{L}][\p{L}\p{M}\s.'-]{1,59}$/u;
    var DOT_ALL = ['bg-ink', 'text-paper', 'bg-mint', 'text-ink', 'bg-white'];
    var DOT_KIND = { active: ['bg-ink', 'text-paper'], done: ['bg-mint', 'text-ink'], todo: ['bg-white', 'text-ink'] };

    var CHIP_BASE = 'flex min-h-[56px] flex-col items-center justify-center border-2 border-ink bg-white px-1 py-2 text-center font-heading leading-tight transition duration-300 ease-out motion-reduce:transition-none ' +
      'cursor-pointer peer-enabled:hover:bg-apricot peer-checked:bg-ink peer-checked:text-paper ' +
      'peer-focus-visible:outline peer-focus-visible:outline-4 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rose ' +
      'peer-disabled:cursor-not-allowed peer-disabled:border-ink/30 peer-disabled:bg-bone peer-disabled:text-ink/40 peer-disabled:line-through';

    /* ---------- Elements ---------- */
    var flow = $('apt-flow');
    var form = $('apt-form');
    var stepText = $('apt-step-text');
    var progress = $('apt-progress');
    var progressBar = $('apt-progress-bar');
    var summaryEl = $('apt-error-summary');
    var nameEl = $('apt-name');
    var phoneEl = $('apt-phone');
    var ageEl = $('apt-age');
    var emailEl = $('apt-email');
    var chamberEl = $('apt-chamber');
    var reasonEl = $('apt-reason');
    var datesEl = $('apt-dates');
    var timesEl = $('apt-times');
    var datesHint = $('apt-dates-hint');
    var timesHint = $('apt-times-hint');
    var feeAmount = $('apt-fee-amount');
    var feeNote = $('apt-fee-note');
    var reviewEl = $('apt-review');
    var consentEl = $('apt-consent');
    var backBtn = $('apt-back');
    var nextLabel = $('apt-next-label');
    var success = $('apt-success');
    var successTitle = $('apt-success-title');
    var refEl = $('apt-ref');
    var successSummary = $('apt-success-summary');
    var waLink = $('apt-wa');
    var toast = $('apt-toast');
    var toastText = $('apt-toast-text');
    var steps = Array.prototype.slice.call(root.querySelectorAll('[data-js="apt-step"]'));
    var indicators = Array.prototype.slice.call(root.querySelectorAll('[data-js="apt-ind"]'));

    var controls = {
      name: nameEl,
      phone: phoneEl,
      age: ageEl,
      email: emailEl,
      chamber: chamberEl,
      reason: reasonEl,
      date: $('apt-date-group'),
      time: $('apt-time-group'),
      consent: consentEl
    };

    /* ---------- In-memory state (never persisted) ---------- */
    var state = { step: 1, date: '', time: null, done: false, ref: '', data: null };
    var errors = {};
    var toastTimer = null;

    /* ---------- Formatting helpers ---------- */
    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function fmtTime(minutes) {
      var h = Math.floor(minutes / 60);
      var m = minutes % 60;
      return (h % 12 || 12) + ':' + pad2(m) + ' ' + (h >= 12 ? 'PM' : 'AM');
    }

    function fmtBDT(n) {
      return '\u09F3' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function isoOf(d) {
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }

    function parseIso(iso) {
      var p = iso.split('-');
      return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    }

    function longDate(d) {
      return WEEKDAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    }

    function cleanPhone(value) { return value.replace(/[\s-]/g, ''); }

    function getVisit() {
      var checked = form.querySelector('input[name="apt-visit"]:checked');
      return checked ? checked.value : 'new';
    }

    function feeFor(chamber, visit) {
      var cfg = CHAMBERS[chamber];
      return cfg ? cfg.fees[visit] : 0;
    }

    /* ---------- Deterministic "booked" slots ---------- */
    function seedFrom(str) {
      var h = 2166136261;
      var i;
      for (i = 0; i < str.length; i += 1) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }

    function makeRng(seed) {
      return function () {
        var t;
        seed = (seed + 0x6D2B79F5) | 0;
        t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function getSlots(iso, chamber) {
      var cfg = CHAMBERS[chamber];
      var d = parseIso(iso);
      var list = [];
      var rand;
      var keepFree;
      var now;
      var nowMinutes;
      var m;

      if (!cfg || cfg.days.indexOf(d.getDay()) < 0) { return list; }

      for (m = cfg.open; m + 30 <= cfg.close; m += 30) {
        list.push({ minutes: m, label: fmtTime(m), status: 'free' });
      }

      rand = makeRng(seedFrom(iso + '|' + chamber));
      keepFree = Math.floor(rand() * list.length);
      list.forEach(function (slot, i) {
        var roll = rand();
        if (i !== keepFree && roll < 0.38) { slot.status = 'booked'; }
      });

      now = new Date();
      if (iso === isoOf(now)) {
        nowMinutes = (now.getHours() * 60) + now.getMinutes();
        list.forEach(function (slot) {
          if (slot.minutes <= nowMinutes + 30) { slot.status = 'passed'; }
        });
      }
      return list;
    }

    function hasFree(iso, chamber) {
      return getSlots(iso, chamber).some(function (slot) { return slot.status === 'free'; });
    }

    /* ---------- Date + slot rendering ---------- */
    function upcomingDates() {
      var list = [];
      var base = new Date();
      var i;
      for (i = 0; i < 14; i += 1) {
        list.push(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i));
      }
      return list;
    }

    function renderDates() {
      var chamber = chamberEl.value;
      var cfg = CHAMBERS[chamber];
      var anyOpen = false;
      var html = '';

      if (state.date && (!cfg || !hasFree(state.date, chamber))) { state.date = ''; }

      upcomingDates().forEach(function (d, i) {
        var iso = isoOf(d);
        var open = !!cfg && cfg.days.indexOf(d.getDay()) > -1;
        var avail = !!cfg && open && hasFree(iso, chamber);
        var note = '';
        if (cfg && !open) { note = ', closed'; }
        if (cfg && open && !avail) { note = ', fully booked'; }
        if (avail) { anyOpen = true; }

        html += '<label class="relative block">' +
          '<input type="radio" name="apt-date" value="' + iso + '" class="peer sr-only"' +
          (avail ? '' : ' disabled') + (state.date === iso ? ' checked' : '') + '>' +
          '<span class="' + CHIP_BASE + '">' +
          '<span aria-hidden="true" class="block text-[11px] font-bold uppercase tracking-widest">' + WEEKDAYS[d.getDay()].slice(0, 3) + '</span>' +
          '<span aria-hidden="true" class="block text-xl font-bold">' + d.getDate() + '</span>' +
          '<span aria-hidden="true" class="block text-[11px] uppercase">' + (i === 0 ? 'Today' : MONTHS[d.getMonth()].slice(0, 3)) + '</span>' +
          '<span class="sr-only">' + longDate(d) + (i === 0 ? ' (today)' : '') + note + '</span>' +
          '</span></label>';
      });
      datesEl.innerHTML = html;

      if (!cfg) {
        datesHint.textContent = 'Select a chamber above to see which days are open.';
      } else if (!anyOpen) {
        datesHint.textContent = 'There are no open days in the next two weeks. Please call our care desk on +880 1711-482905.';
      } else {
        datesHint.textContent = 'Greyed-out days are closed or fully booked.';
      }
    }

    function renderSlots() {
      var chamber = chamberEl.value;
      var slots = (state.date && CHAMBERS[chamber]) ? getSlots(state.date, chamber) : [];
      var html = '';

      if (state.time !== null) {
        var stillFree = slots.some(function (slot) {
          return slot.minutes === state.time && slot.status === 'free';
        });
        if (!stillFree) { state.time = null; }
      }

      slots.forEach(function (slot) {
        var free = slot.status === 'free';
        var sub = free ? '30 min' : (slot.status === 'booked' ? 'Booked' : 'Passed');
        html += '<label class="relative block">' +
          '<input type="radio" name="apt-time" value="' + slot.minutes + '" class="peer sr-only"' +
          (free ? '' : ' disabled') + (state.time === slot.minutes ? ' checked' : '') + '>' +
          '<span class="' + CHIP_BASE + '">' +
          '<span aria-hidden="true" class="block text-sm font-bold uppercase">' + slot.label + '</span>' +
          '<span aria-hidden="true" class="block text-[11px] uppercase">' + sub + '</span>' +
          '<span class="sr-only">' + slot.label + (free ? '' : ', ' + (slot.status === 'booked' ? 'already booked' : 'no longer available')) + '</span>' +
          '</span></label>';
      });
      timesEl.innerHTML = html;

      timesHint.textContent = state.date
        ? 'Struck-through slots are already booked. Each visit lasts about 30 minutes.'
        : 'Choose a chamber and a date to see time slots.';
    }

    function updateFee() {
      var chamber = chamberEl.value;
      var cfg = CHAMBERS[chamber];
      var visit = getVisit();
      if (!cfg) {
        feeAmount.textContent = '\u2014';
        feeNote.textContent = 'Select a chamber to see your consultation fee.';
        return;
      }
      feeAmount.textContent = fmtBDT(cfg.fees[visit]);
      feeNote.textContent = cfg.notes[visit];
    }

    /* ---------- Errors ---------- */
    function focusTarget(key) {
      if (key === 'date') { return datesEl.querySelector('input:not(:disabled)') || chamberEl; }
      if (key === 'time') { return timesEl.querySelector('input:not(:disabled)') || datesEl.querySelector('input:not(:disabled)') || chamberEl; }
      return controls[key];
    }

    function renderErrorSummary() {
      var keys = ORDER.filter(function (k) { return errors[k]; });
      var box;
      var heading;
      var list;
      summaryEl.textContent = '';
      if (!keys.length) { return; }

      box = document.createElement('div');
      box.className = 'border-2 border-red-700 bg-white p-4 shadow-brut-sm';
      heading = document.createElement('p');
      heading.className = 'font-heading text-base font-bold uppercase text-red-700';
      heading.textContent = keys.length === 1 ? 'There is 1 problem to fix' : 'There are ' + keys.length + ' problems to fix';
      list = document.createElement('ul');
      list.className = 'mt-2 list-disc space-y-1 pl-5 text-sm';

      keys.forEach(function (k) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#';
        a.setAttribute('data-key', k);
        a.className = 'font-semibold text-red-700 underline underline-offset-2 hover:text-ink focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-rose';
        a.textContent = errors[k];
        li.appendChild(a);
        list.appendChild(li);
      });

      box.appendChild(heading);
      box.appendChild(list);
      summaryEl.appendChild(box);
    }

    function setError(key, message) {
      var el = $('apt-' + key + '-error');
      errors[key] = message;
      el.textContent = message;
      el.classList.remove('hidden');
      controls[key].setAttribute('aria-invalid', 'true');
    }

    function clearError(key, skipRender) {
      var el = $('apt-' + key + '-error');
      if (!errors[key]) { return; }
      delete errors[key];
      el.textContent = '';
      el.classList.add('hidden');
      controls[key].removeAttribute('aria-invalid');
      if (!skipRender) { renderErrorSummary(); }
    }

    function clearAllErrors() {
      ORDER.forEach(function (k) { clearError(k, true); });
      renderErrorSummary();
    }

    summaryEl.addEventListener('click', function (event) {
      var link = event.target.closest('a[data-key]');
      var target;
      if (!link) { return; }
      event.preventDefault();
      target = focusTarget(link.getAttribute('data-key'));
      if (target) { target.focus(); }
    });

    /* ---------- Validation ---------- */
    function validateStep(n) {
      var firstBad = null;
      var target;

      function fail(key, message) {
        setError(key, message);
        if (!firstBad) { firstBad = key; }
      }

      FIELD_KEYS[n].forEach(function (k) { clearError(k, true); });

      if (n === 1) {
        var fullName = nameEl.value.trim().replace(/\s+/g, ' ');
        var phone = cleanPhone(phoneEl.value);
        var age = ageEl.value.trim();
        var email = emailEl.value.trim();

        if (!NAME_RE.test(fullName)) { fail('name', 'Please enter your full name.'); }
        if (!phone) {
          fail('phone', 'Please enter your mobile number.');
        } else if (!PHONE_RE.test(phone)) {
          fail('phone', 'Enter a valid Bangladeshi mobile number, for example 01711 234567.');
        }
        if (!age) {
          fail('age', 'Please enter your age.');
        } else if (!/^\d{1,2}$/.test(age) || Number(age) < 12 || Number(age) > 80) {
          fail('age', 'Age must be a number between 12 and 80.');
        }
        if (email && !EMAIL_RE.test(email)) {
          fail('email', 'Enter a valid email address, or leave this field empty.');
        }
      }

      if (n === 2) {
        if (!chamberEl.value) { fail('chamber', 'Please choose a chamber.'); }
        if (!reasonEl.value) { fail('reason', 'Please choose a reason for your visit.'); }
        if (!state.date) { fail('date', 'Please pick an available date.'); }
        if (state.time === null) { fail('time', 'Please pick a time slot.'); }
      }

      if (n === 3 && !consentEl.checked) {
        fail('consent', 'Please tick the box to confirm your details.');
      }

      renderErrorSummary();
      if (firstBad) {
        target = focusTarget(firstBad);
        if (target) { target.focus(); }
        return false;
      }
      return true;
    }

    /* ---------- Summary data ---------- */
    function collect() {
      var chamber = chamberEl.value;
      var cfg = CHAMBERS[chamber];
      var visit = getVisit();
      var d = parseIso(state.date);
      return {
        name: nameEl.value.trim().replace(/\s+/g, ' '),
        phone: cleanPhone(phoneEl.value),
        age: ageEl.value.trim(),
        email: emailEl.value.trim(),
        visitLabel: visit === 'follow' ? 'Follow-up' : 'New patient',
        chamber: chamber,
        address: cfg ? cfg.address : '',
        reason: reasonEl.value,
        iso: state.date,
        dateLabel: longDate(d),
        minutes: state.time,
        timeLabel: fmtTime(state.time),
        fee: feeFor(chamber, visit)
      };
    }

    function renderSummary(target, data) {
      var rows = [
        ['Patient', data.name],
        ['Mobile', data.phone],
        ['Age', data.age + ' years']
      ];
      if (data.email) { rows.push(['Email', data.email]); }
      rows.push(['Visit type', data.visitLabel]);
      rows.push(['Chamber', data.chamber, data.address]);
      rows.push(['Reason', data.reason]);
      rows.push(['Date', data.dateLabel]);
      rows.push(['Time', data.timeLabel]);
      rows.push(['Fee', fmtBDT(data.fee)]);

      target.textContent = '';
      rows.forEach(function (row) {
        var wrap = document.createElement('div');
        var dt = document.createElement('dt');
        var dd = document.createElement('dd');
        var sub;
        wrap.className = 'grid grid-cols-[6.5rem_1fr] gap-3 border-b-2 border-ink/15 py-3 last:border-b-0';
        dt.className = 'font-heading text-xs font-bold uppercase tracking-widest';
        dt.textContent = row[0];
        dd.className = 'min-w-0 break-words text-base font-medium';
        dd.textContent = row[1];
        if (row[2]) {
          sub = document.createElement('span');
          sub.className = 'mt-1 block text-sm font-normal text-ink/80';
          sub.textContent = row[2];
          dd.appendChild(sub);
        }
        wrap.appendChild(dt);
        wrap.appendChild(dd);
        target.appendChild(wrap);
      });
    }

    /* ---------- Step navigation ---------- */
    function updateIndicators() {
      indicators.forEach(function (li) {
        var idx = Number(li.getAttribute('data-step'));
        var dot = li.querySelector('[data-js="apt-ind-dot"]');
        var kind = idx === state.step ? 'active' : (idx < state.step ? 'done' : 'todo');
        DOT_ALL.forEach(function (c) { dot.classList.remove(c); });
        DOT_KIND[kind].forEach(function (c) { dot.classList.add(c); });
        dot.textContent = kind === 'done' ? '\u2713' : String(idx);
        if (idx === state.step) {
          li.setAttribute('aria-current', 'step');
        } else {
          li.removeAttribute('aria-current');
        }
      });

      Object.keys(PROGRESS).forEach(function (k) { progressBar.classList.remove(PROGRESS[k]); });
      progressBar.classList.add(PROGRESS[state.step]);
      progress.setAttribute('aria-valuenow', String(state.step));
      progress.setAttribute('aria-valuetext', 'Step ' + state.step + ' of 3: ' + STEP_NAMES[state.step - 1]);
      stepText.textContent = 'Step ' + state.step + ' of 3 \u00B7 ' + STEP_NAMES[state.step - 1];
    }

    function updateNav() {
      backBtn.classList.toggle('hidden', state.step === 1);
      backBtn.classList.toggle('inline-flex', state.step !== 1);
      nextLabel.textContent = state.step === 3 ? 'Confirm booking' : 'Next';
    }

    function revealEl(el, direction, instant) {
      var from = direction > 0 ? 'translate-x-6' : '-translate-x-6';
      el.classList.remove('hidden');
      if (DrSite.reduced || instant) { return; }
      el.classList.add('opacity-0', from);
      void el.offsetWidth;
      el.classList.remove('opacity-0', from);
    }

    function goStep(n, focus, instant) {
      var direction = n >= state.step ? 1 : -1;
      var title;

      if (n === 2) {
        renderDates();
        renderSlots();
      }
      if (n === 3) { renderSummary(reviewEl, collect()); }

      steps.forEach(function (stepEl) {
        var idx = Number(stepEl.getAttribute('data-step'));
        if (idx === n) {
          revealEl(stepEl, direction, instant);
        } else {
          stepEl.classList.add('hidden');
        }
      });

      state.step = n;
      updateIndicators();
      updateNav();

      if (focus) {
        title = $('apt-step-' + n + '-title');
        if (title) { title.focus(); }
      }
    }

    function next() {
      if (!validateStep(state.step)) { return; }
      goStep(state.step + 1, true);
    }

    /* ---------- Success state ---------- */
    function makeRef() {
      var d = new Date();
      var stamp = pad2(d.getFullYear() % 100) + pad2(d.getMonth() + 1) + pad2(d.getDate());
      return 'DTR-' + stamp + '-' + (1000 + Math.floor(Math.random() * 9000));
    }

    function whatsappText(data, ref) {
      return [
        'Hello, I would like to confirm my appointment with Dr. Tahmina Sultana Rahman.',
        '',
        'Reference: ' + ref,
        'Name: ' + data.name,
        'Mobile: ' + data.phone,
        'Age: ' + data.age,
        'Visit type: ' + data.visitLabel,
        'Chamber: ' + data.chamber,
        'Reason: ' + data.reason,
        'Date: ' + data.dateLabel,
        'Time: ' + data.timeLabel,
        'Fee: ' + fmtBDT(data.fee)
      ].join('\n');
    }

    function showSuccess() {
      var data = collect();
      var firstName = data.name.split(' ')[0];

      state.ref = makeRef();
      state.data = data;
      state.done = true;

      refEl.textContent = state.ref;
      successTitle.textContent = 'Thank you, ' + firstName;
      renderSummary(successSummary, data);
      waLink.href = 'https://wa.me/8801711482905?text=' + encodeURIComponent(whatsappText(data, state.ref));

      flow.classList.add('hidden');
      success.classList.remove('hidden');
      if (!DrSite.reduced) {
        success.classList.add('opacity-0', 'scale-95');
        void success.offsetWidth;
        success.classList.remove('opacity-0', 'scale-95');
      }
      successTitle.focus();
    }

    /* ---------- Calendar file (.ics) ---------- */
    function icsEscape(text) {
      return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    }

    function icsStamp(date) {
      return date.getUTCFullYear() + pad2(date.getUTCMonth() + 1) + pad2(date.getUTCDate()) + 'T' +
        pad2(date.getUTCHours()) + pad2(date.getUTCMinutes()) + pad2(date.getUTCSeconds()) + 'Z';
    }

    function icsFold(line) {
      var out = [];
      var rest = line;
      while (rest.length > 74) {
        out.push(rest.slice(0, 74));
        rest = ' ' + rest.slice(74);
      }
      out.push(rest);
      return out.join('\r\n');
    }

    function downloadIcs() {
      var data = state.data;
      var p;
      var start;
      var end;
      var lines;
      var blob;
      var url;
      var link;

      if (!data) { return; }
      p = data.iso.split('-');
      /* Chamber times are Bangladesh time (UTC+6). */
      start = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 0, data.minutes - 360));
      end = new Date(start.getTime() + (30 * 60000));

      lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Dr. Tahmina Sultana Rahman//Appointments//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:' + state.ref + '@drtahminarahman.com',
        'DTSTAMP:' + icsStamp(new Date()),
        'DTSTART:' + icsStamp(start),
        'DTEND:' + icsStamp(end),
        'SUMMARY:' + icsEscape('Appointment with Dr. Tahmina Sultana Rahman'),
        'LOCATION:' + icsEscape(data.chamber + ', ' + data.address),
        'DESCRIPTION:' + icsEscape('Reason: ' + data.reason + '\nVisit type: ' + data.visitLabel + '\nFee: BDT ' + String(data.fee).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '\nReference: ' + state.ref),
        'BEGIN:VALARM',
        'TRIGGER:-PT120M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Appointment reminder',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
      ].map(icsFold);

      blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
      url = URL.createObjectURL(blob);
      link = document.createElement('a');
      link.href = url;
      link.download = 'appointment-' + state.ref + '.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    /* ---------- Reset ---------- */
    function resetBooking(quiet) {
      form.reset();
      state.date = '';
      state.time = null;
      state.done = false;
      state.ref = '';
      state.data = null;
      clearAllErrors();
      success.classList.add('hidden');
      flow.classList.remove('hidden');
      renderDates();
      renderSlots();
      updateFee();
      goStep(1, !quiet, true);
    }

    /* ---------- Toast + field highlight ---------- */
    function showToast(message) {
      toastText.textContent = message;
      toast.classList.remove('opacity-0', 'translate-y-4');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () {
        toast.classList.add('opacity-0', 'translate-y-4');
      }, 4000);
    }

    function pulse(el) {
      el.classList.add('ring-4', 'ring-ink');
      window.setTimeout(function () { el.classList.remove('ring-4', 'ring-ink'); }, 2000);
    }

    /* ---------- Cross-section events ---------- */
    function hasOption(select, value) {
      return Array.prototype.some.call(select.options, function (opt) { return opt.value === value && value !== ''; });
    }

    function applyService(name) {
      if (!hasOption(reasonEl, name)) { return; }
      if (state.done) { resetBooking(true); }
      reasonEl.value = name;
      clearError('reason');
      pulse(reasonEl);
      showToast('Service selected: ' + name);
      if (state.step === 3) { renderSummary(reviewEl, collect()); }
    }

    function applyChamber(name) {
      if (!hasOption(chamberEl, name)) { return; }
      if (state.done) { resetBooking(true); }
      chamberEl.value = name;
      clearError('chamber');
      renderDates();
      renderSlots();
      updateFee();
      pulse(chamberEl);
      showToast('Chamber selected: ' + name);
      if (state.step === 3) {
        if (!state.date || state.time === null) {
          goStep(2, true);
        } else {
          renderSummary(reviewEl, collect());
        }
      }
    }

    window.addEventListener('dr:select-service', function (event) {
      applyService(event.detail && event.detail.service);
    });

    window.addEventListener('dr:select-chamber', function (event) {
      applyChamber(event.detail && event.detail.chamber);
    });

    /* ---------- Field listeners ---------- */
    [['name', nameEl], ['phone', phoneEl], ['age', ageEl], ['email', emailEl]].forEach(function (pair) {
      pair[1].addEventListener('input', function () { clearError(pair[0]); });
    });

    chamberEl.addEventListener('change', function () {
      clearError('chamber');
      renderDates();
      renderSlots();
      updateFee();
    });

    reasonEl.addEventListener('change', function () { clearError('reason'); });

    Array.prototype.forEach.call(form.querySelectorAll('input[name="apt-visit"]'), function (radio) {
      radio.addEventListener('change', updateFee);
    });

    datesEl.addEventListener('change', function (event) {
      if (event.target.name !== 'apt-date') { return; }
      state.date = event.target.value;
      clearError('date');
      renderSlots();
    });

    timesEl.addEventListener('change', function (event) {
      if (event.target.name !== 'apt-time') { return; }
      state.time = Number(event.target.value);
      clearError('time');
    });

    consentEl.addEventListener('change', function () { clearError('consent'); });

    /* ---------- Form, buttons ---------- */
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (state.step < 3) {
        next();
      } else if (validateStep(3)) {
        showSuccess();
      }
    });

    backBtn.addEventListener('click', function () {
      if (state.step > 1) {
        clearAllErrors();
        goStep(state.step - 1, true);
      }
    });

    root.addEventListener('click', function (event) {
      var edit = event.target.closest('[data-js="apt-edit"]');
      if (!edit) { return; }
      clearAllErrors();
      goStep(Number(edit.getAttribute('data-step')), true);
    });

    $('apt-ics').addEventListener('click', downloadIcs);
    $('apt-reset').addEventListener('click', function () { resetBooking(false); });

    /* ---------- Initial render ---------- */
    renderDates();
    renderSlots();
    updateFee();
    updateIndicators();
    updateNav();
  });
})();
