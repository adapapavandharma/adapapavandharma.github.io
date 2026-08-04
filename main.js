/* ============================================================
   Pavan Dharma Adapa — portfolio
   Vanilla JS, no dependencies.

   The site holds two profiles ("tracks") in one document:
     epic      → Healthcare Data Analyst / Epic reporting
     analytics → Data Analyst / BI

   Every track-specific element carries data-track="epic" or
   data-track="analytics". Anything without the attribute (or with
   data-track="both") is always shown. With JS disabled the whole
   document renders, which is the right fallback for crawlers.
   ============================================================ */
(function () {
  'use strict';

  var DEFAULT_TRACK = 'epic';
  var TRACKS = ['epic', 'analytics'];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var root = document.documentElement;
  root.classList.add('js');

  /* ---------------------------------------------------------
     track
     --------------------------------------------------------- */

  var TRACK_COPY = {
    epic: {
      typed: [
        'Healthcare Data Analyst',
        'Epic Clarity · Cogito · Caboodle reporting',
        'Real CDC & CMS data · design-correct inference',
        'M.S. Computer Science & Engineering'
      ],
      resumeHref: 'resume/Pavan_Dharma_Adapa_Healthcare_Data_Analyst.pdf',
      resumeLabel: 'Résumé — Healthcare (PDF)',
      title: 'Pavan Dharma Adapa — Healthcare Data Analyst'
    },
    analytics: {
      typed: [
        'Data Analyst',
        'SQL · Python · Tableau · Power BI',
        'Experimentation · calibration · survey statistics',
        'M.S. Computer Science & Engineering'
      ],
      resumeHref: 'resume/Pavan_Dharma_Adapa_Data_Analyst.pdf',
      resumeLabel: 'Résumé — Data Analyst (PDF)',
      title: 'Pavan Dharma Adapa — Data Analyst'
    }
  };

  var track = null;

  function readInitialTrack() {
    var q = new URLSearchParams(location.search).get('track');
    if (q) {
      q = q.toLowerCase();
      if (TRACKS.indexOf(q) > -1) return q;
      // friendly aliases so a mistyped link still lands somewhere sensible
      if (/health|clinic|epic|clarity/.test(q)) return 'epic';
      if (/data|analy|bi|business/.test(q)) return 'analytics';
    }
    try {
      var saved = localStorage.getItem('pda:track');
      if (TRACKS.indexOf(saved) > -1) return saved;
    } catch (e) { /* storage blocked — fall through */ }
    return DEFAULT_TRACK;
  }

  function setTrack(next, opts) {
    opts = opts || {};
    if (TRACKS.indexOf(next) < 0 || next === track) return;
    track = next;
    root.setAttribute('data-track', track);

    document.querySelectorAll('[data-track]').forEach(function (el) {
      if (el === root) return;
      var want = el.getAttribute('data-track');
      el.classList.toggle('off', want !== 'both' && want !== track);
    });

    document.querySelectorAll('[data-set-track]').forEach(function (btn) {
      btn.setAttribute('aria-selected', String(btn.getAttribute('data-set-track') === track));
    });

    var copy = TRACK_COPY[track];
    var link = document.getElementById('resume-link');
    if (link) link.setAttribute('href', copy.resumeHref);
    var label = document.getElementById('resume-label');
    if (label) label.textContent = copy.resumeLabel;
    document.title = copy.title;

    try { localStorage.setItem('pda:track', track); } catch (e) {}

    if (!opts.silent) {
      try {
        var url = new URL(location.href);
        url.searchParams.set('track', track);
        history.replaceState(null, '', url);
      } catch (e) { /* file:// origins reject replaceState — harmless */ }
    }

    startTyping(copy.typed);
    resetCounters();
  }

  document.querySelectorAll('[data-set-track]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTrack(btn.getAttribute('data-set-track'));
    });
  });

  /* ---------------------------------------------------------
     typed hero line
     --------------------------------------------------------- */

  var typedEl = document.getElementById('typed');
  var typeTimer = null;

  function startTyping(phrases) {
    if (!typedEl) return;
    clearTimeout(typeTimer);

    if (reduceMotion) {
      typedEl.textContent = phrases[0];
      return;
    }

    var i = 0, j = 0, erasing = false;

    (function tick() {
      var word = phrases[i];
      j += erasing ? -1 : 1;
      typedEl.textContent = word.slice(0, j);

      var wait = erasing ? 28 : 46;
      if (!erasing && j === word.length) { erasing = true; wait = 2100; }
      else if (erasing && j === 0) { erasing = false; i = (i + 1) % phrases.length; wait = 320; }

      typeTimer = setTimeout(tick, wait);
    })();
  }

  /* ---------------------------------------------------------
     metric counters
     --------------------------------------------------------- */

  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));

  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = String(target); return; }

    var dur = 900, t0 = null, settled = false;

    function settle() {
      if (settled) return;
      settled = true;
      el.textContent = String(target);
    }

    // rAF is throttled to a standstill in background tabs, which would leave the
    // number sitting at 0. Guarantee the real figure lands either way.
    setTimeout(settle, dur + 500);

    function step(ts) {
      if (settled) return;
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step); else settled = true;
    }
    requestAnimationFrame(step);
  }

  function resetCounters() {
    counters.forEach(function (el) {
      var li = el.closest('li');
      if (li && li.classList.contains('off')) return;
      if (el.dataset.done === '1') return;
      el.dataset.done = '1';
      runCounter(el);
    });
  }

  /* ---------------------------------------------------------
     scroll reveal + progress rail + nav highlight
     --------------------------------------------------------- */

  var revealables = document.querySelectorAll('.card, .tl-item, .skill-grp, .pub, .edu');

  function revealAll() {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  if ('IntersectionObserver' in window) {
    revealables.forEach(function (el) { el.classList.add('reveal'); });

    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        revealObs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    revealables.forEach(function (el) { revealObs.observe(el); });

    // Fail-safe: the reveal animation starts elements at opacity 0, so anything
    // that stops the observer firing (background tab, no compositing, a browser
    // quirk) would leave the page blank. Never let that happen — 2s and it all
    // comes in regardless.
    setTimeout(revealAll, 2000);
  } else {
    revealAll();
  }

  var fill = document.getElementById('scroll-fill');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;

      if (fill) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        fill.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
      }

      var mark = window.scrollY + window.innerHeight * 0.32;
      var active = -1;
      sections.forEach(function (s, k) { if (s.offsetTop <= mark) active = k; });
      navLinks.forEach(function (a, k) { a.classList.toggle('on', k === active); });
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------------------------------------------------------
     theme
     --------------------------------------------------------- */

  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.setAttribute('aria-label', 'Switch to ' + (mode === 'dark' ? 'light' : 'dark') + ' theme');
    try { localStorage.setItem('pda:theme', mode); } catch (e) {}
  }

  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('pda:theme'); } catch (e) {}
    if (saved !== 'dark' && saved !== 'light') {
      saved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    applyTheme(saved);
  })();

  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------------------------------------------------------
     toast + copy
     --------------------------------------------------------- */

  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 1900);
  }

  function copyText(text, label) {
    var done = function () { toast(label + ' copied'); };
    var fail = function () { toast('Copy failed — ' + text); };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fail);
      return;
    }
    // file:// and older browsers
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy') ? done() : fail(); } catch (e) { fail(); }
    document.body.removeChild(ta);
  }

  document.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = btn.getAttribute('data-copy');
      copyText(val, val.indexOf('@') > -1 ? 'Email' : 'Phone');
    });
  });

  /* ---------------------------------------------------------
     command palette
     --------------------------------------------------------- */

  var COMMANDS = [
    { icon: '#', label: 'Work',       hint: 'section', keys: 'projects portfolio', run: function () { goTo('#work'); } },
    { icon: '#', label: 'Experience', hint: 'section', keys: 'jobs roles history', run: function () { goTo('#experience'); } },
    { icon: '#', label: 'Skills',     hint: 'section', keys: 'stack tools tech',   run: function () { goTo('#skills'); } },
    { icon: '#', label: 'Research',   hint: 'section', keys: 'publications education degree', run: function () { goTo('#research'); } },
    { icon: '#', label: 'Contact',    hint: 'section', keys: 'email hire reach',   run: function () { goTo('#contact'); } },
    { icon: '↑', label: 'Back to top', hint: 'section', keys: 'home start',        run: function () { goTo('#top'); } },

    { icon: '⇄', label: 'Switch to Healthcare / Epic profile', hint: 'track', keys: 'clinical clarity cogito caboodle', run: function () { setTrack('epic'); toast('Healthcare / Epic profile'); } },
    { icon: '⇄', label: 'Switch to Data Analytics profile',    hint: 'track', keys: 'bi sql tableau business',          run: function () { setTrack('analytics'); toast('Data Analytics profile'); } },

    { icon: '⎘', label: 'Copy email address', hint: 'copy', keys: 'mail gmail contact', run: function () { copyText('adapapavandharma@gmail.com', 'Email'); } },
    { icon: '⎘', label: 'Copy phone number',  hint: 'copy', keys: 'call tel',           run: function () { copyText('+16623709614', 'Phone'); } },

    { icon: '↗', label: 'Open GitHub',   hint: 'link', keys: 'code repos',    run: function () { window.open('https://github.com/adapapavandharma', '_blank', 'noopener'); } },
    { icon: '↗', label: 'Open LinkedIn', hint: 'link', keys: 'profile social', run: function () { window.open('https://www.linkedin.com/in/adapapavandharma', '_blank', 'noopener'); } },
    { icon: '↓', label: 'Download résumé (current profile)', hint: 'file', keys: 'cv pdf', run: function () { var l = document.getElementById('resume-link'); if (l) l.click(); } },

    { icon: '◐', label: 'Toggle light / dark theme', hint: 'view',  keys: 'dark light mode', run: function () { applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); } },
    { icon: '⎙', label: 'Print / save as PDF',       hint: 'view',  keys: 'export paper',    run: function () { window.print(); } }
  ];

  function goTo(hash) {
    var el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  var pal = document.getElementById('palette');
  var palInput = document.getElementById('palette-input');
  var palList = document.getElementById('palette-list');
  var shown = [];
  var cursor = 0;

  function render(filter) {
    var q = (filter || '').trim().toLowerCase();
    shown = COMMANDS.filter(function (c) {
      if (!q) return true;
      return (c.label + ' ' + c.hint + ' ' + c.keys).toLowerCase().indexOf(q) > -1;
    });
    cursor = 0;

    if (!shown.length) {
      palList.innerHTML = '<li class="palette-empty">No matching command</li>';
      return;
    }

    palList.innerHTML = shown.map(function (c, i) {
      return '<li role="option" data-i="' + i + '" aria-selected="' + (i === 0) + '">' +
             '<span class="pi" aria-hidden="true">' + c.icon + '</span>' +
             '<span>' + c.label + '</span>' +
             '<span class="pk">' + c.hint + '</span></li>';
    }).join('');
  }

  function move(delta) {
    if (!shown.length) return;
    cursor = (cursor + delta + shown.length) % shown.length;
    Array.prototype.forEach.call(palList.children, function (li, i) {
      li.setAttribute('aria-selected', String(i === cursor));
      if (i === cursor) li.scrollIntoView({ block: 'nearest' });
    });
  }

  function openPalette() {
    if (!pal) return;
    pal.hidden = false;
    palInput.value = '';
    render('');
    palInput.focus();
  }

  function closePalette() {
    if (pal) pal.hidden = true;
  }

  function fire(i) {
    var cmd = shown[i];
    closePalette();
    if (cmd) cmd.run();
  }

  var openBtn = document.getElementById('palette-open');
  if (openBtn) openBtn.addEventListener('click', openPalette);

  if (pal) {
    pal.querySelector('[data-palette-close]').addEventListener('click', closePalette);
    palInput.addEventListener('input', function () { render(palInput.value); });

    palList.addEventListener('click', function (e) {
      var li = e.target.closest('li[data-i]');
      if (li) fire(parseInt(li.getAttribute('data-i'), 10));
    });
    palList.addEventListener('mousemove', function (e) {
      var li = e.target.closest('li[data-i]');
      if (!li) return;
      var i = parseInt(li.getAttribute('data-i'), 10);
      if (i !== cursor) { cursor = i; move(0); }
    });

    palInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); fire(cursor); }
      else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    });
  }

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      pal && pal.hidden ? openPalette() : closePalette();
      return;
    }
    if (e.key === 'Escape') closePalette();

    // bare "/" opens the palette, like a terminal search — unless typing
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && tag !== 'input' && tag !== 'textarea') {
      e.preventDefault();
      openPalette();
    }
  });

  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */

  setTrack(readInitialTrack(), { silent: false });
  onScroll();

  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();
