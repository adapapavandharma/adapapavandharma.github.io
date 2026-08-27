/* ============================================================
   Pavan Dharma Adapa — portfolio

   Deliberately tiny. The previous version carried a track
   framework, a typed-text animation, a command palette, animated
   counters and a scrollspy — and a single bad selector in the
   scrollspy threw, which killed every script after it and took
   the whole page down.

   This file does three things and cannot take the page with it
   if any of them fail.
   ============================================================ */
(function () {
  'use strict';

  /* ---- theme toggle ------------------------------------- */
  var root = document.documentElement;
  var btn = document.getElementById('theme');

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }
  function currentTheme() {
    return root.getAttribute('data-theme') || systemTheme();
  }
  if (btn) {
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      btn.setAttribute('aria-label',
        next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      try { localStorage.setItem('pda:theme', next); } catch (e) { /* private mode */ }
    });
  }

  /* ---- current year ------------------------------------- */
  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  /* ---- highlight the section you are reading ------------ */
  /* Guarded: only hash links, and only ones that resolve to a
     real element. A non-hash href like "dashboard/" is not a
     valid selector and used to throw here. */
  try {
    var links = [].slice.call(document.querySelectorAll('.site nav a[href^="#"]'));
    var targets = links
      .map(function (a) {
        var id = a.getAttribute('href');
        if (!id || id.length < 2 || id.charAt(0) !== '#') return null;
        var el = null;
        try { el = document.querySelector(id); } catch (e) { el = null; }
        return el ? { link: a, el: el } : null;
      })
      .filter(Boolean);

    if (targets.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var hit = targets.filter(function (t) { return t.el === entry.target; })[0];
          if (!hit) return;
          hit.link.style.color = entry.isIntersecting ? 'var(--accent)' : '';
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      targets.forEach(function (t) { io.observe(t.el); });
    }
  } catch (e) { /* navigation highlight is decoration; never fatal */ }
})();
