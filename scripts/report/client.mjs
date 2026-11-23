/**
 * Client behaviour for verdict.html: version switch, navigation, accordions,
 * filters and back-to-top. It runs locally, uses no network APIs and stores only
 * the selected version in localStorage when storage is available.
 */
export const REPORT_JS = `
(function () {
  'use strict';

  var body = document.body;
  var hasV2 = body.getAttribute('data-has-v2') === 'true';

  function readPreference(key) {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  }
  function writePreference(key, value) {
    try { window.localStorage.setItem(key, value); } catch (error) { /* local file mode */ }
  }

  /* ---------- V1 / V2 switch ---------- */

  function setVersion(version) {
    var next = String(version) === '2' && hasV2 ? '2' : '1';
    body.setAttribute('data-version', next);
    var buttons = document.querySelectorAll('[data-version-btn]');
    for (var index = 0; index < buttons.length; index += 1) {
      buttons[index].setAttribute('aria-pressed', buttons[index].getAttribute('data-version-btn') === next ? 'true' : 'false');
    }
    var label = document.querySelector('[data-version-label]');
    if (label) label.textContent = 'Версия V' + next;
    writePreference('tribunal-version', next);
  }

  var savedVersion = readPreference('tribunal-version');
  setVersion(savedVersion === '2' && hasV2 ? '2' : '1');

  var versionButtons = document.querySelectorAll('[data-version-btn]');
  for (var versionIndex = 0; versionIndex < versionButtons.length; versionIndex += 1) {
    versionButtons[versionIndex].addEventListener('click', function (event) {
      setVersion(event.currentTarget.getAttribute('data-version-btn'));
    });
  }

  var gotoVersionButtons = document.querySelectorAll('[data-goto-version]');
  for (var gotoIndex = 0; gotoIndex < gotoVersionButtons.length; gotoIndex += 1) {
    gotoVersionButtons[gotoIndex].addEventListener('click', function (event) {
      event.preventDefault();
      var button = event.currentTarget;
      setVersion(button.getAttribute('data-goto-version'));
      var targetSelector = button.getAttribute('data-goto') || '#verdict';
      var target = document.querySelector(targetSelector);
      if (target) target.scrollIntoView({ block: 'start' });
    });
  }

  /* ---------- mobile navigation ---------- */

  var sidebar = document.getElementById('sidebar');
  var navToggle = document.getElementById('nav-toggle');

  function closeNavigation() {
    if (!sidebar || !navToggle) return;
    sidebar.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    body.classList.remove('nav-open');
  }

  if (sidebar && navToggle) {
    navToggle.addEventListener('click', function () {
      var open = sidebar.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      body.classList.toggle('nav-open', open);
    });
    var navLinks = sidebar.querySelectorAll('a');
    for (var navIndex = 0; navIndex < navLinks.length; navIndex += 1) {
      navLinks[navIndex].addEventListener('click', closeNavigation);
    }
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNavigation();
    });
    document.addEventListener('click', function (event) {
      if (!sidebar.classList.contains('is-open')) return;
      if (sidebar.contains(event.target) || navToggle.contains(event.target)) return;
      closeNavigation();
    });
  }

  /* ---------- active navigation link ---------- */

  var navAnchors = document.querySelectorAll('.nav-link');
  var navSections = [];
  for (var anchorIndex = 0; anchorIndex < navAnchors.length; anchorIndex += 1) {
    var href = navAnchors[anchorIndex].getAttribute('href') || '';
    if (href.charAt(0) !== '#') continue;
    var section = document.getElementById(href.slice(1));
    if (section) navSections.push({ anchor: navAnchors[anchorIndex], section: section });
  }

  function updateActiveNavigation() {
    if (navSections.length === 0) return;
    var position = window.scrollY + 140;
    var current = navSections[0];
    for (var index = 0; index < navSections.length; index += 1) {
      var top = navSections[index].section.getBoundingClientRect().top + window.scrollY;
      if (top <= position) current = navSections[index];
    }
    for (var linkIndex = 0; linkIndex < navSections.length; linkIndex += 1) {
      var active = navSections[linkIndex] === current;
      navSections[linkIndex].anchor.classList.toggle('is-active', active);
      if (active) navSections[linkIndex].anchor.setAttribute('aria-current', 'true');
      else navSections[linkIndex].anchor.removeAttribute('aria-current');
    }
  }

  var scrollScheduled = false;
  window.addEventListener('scroll', function () {
    if (scrollScheduled) return;
    scrollScheduled = true;
    window.requestAnimationFrame(function () {
      scrollScheduled = false;
      updateActiveNavigation();
      updateToTop();
    });
  }, { passive: true });
  updateActiveNavigation();

  /* ---------- expand / collapse ---------- */

  var expandButton = document.getElementById('expand-toggle');
  var expanded = false;

  function setAllAccordions(open) {
    var items = document.querySelectorAll('main details.acc');
    for (var index = 0; index < items.length; index += 1) items[index].open = open;
    expanded = open;
    if (expandButton) {
      expandButton.setAttribute('aria-pressed', open ? 'true' : 'false');
      expandButton.textContent = open ? 'Свернуть' : 'Развернуть';
    }
  }

  if (expandButton) {
    expandButton.addEventListener('click', function () { setAllAccordions(!expanded); });
  }

  /* ---------- table and evidence filters ---------- */

  var scopes = document.querySelectorAll('[data-filter-scope]');
  for (var scopeIndex = 0; scopeIndex < scopes.length; scopeIndex += 1) {
    (function (scope) {
      var buttons = scope.querySelectorAll('button[data-filter-value]');
      var search = scope.querySelector('[data-filter-search]');
      var rows = scope.querySelectorAll('[data-filter-row]');
      var status = scope.querySelector('[data-filter-status]');
      var empty = scope.querySelector('[data-filter-empty]');
      var active = 'all';

      function applyFilter() {
        var query = search && search.value ? search.value.trim().toLowerCase() : '';
        var visible = 0;
        for (var rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
          var row = rows[rowIndex];
          var tokens = (row.getAttribute('data-filter-value') || '').split(/\\s+/);
          var matchesValue = active === 'all' || tokens.indexOf(active) !== -1;
          if (active === 'unverified' && row.getAttribute('data-filter-unverified') === 'true') matchesValue = true;
          var haystack = (row.getAttribute('data-search') || '').toLowerCase();
          var matchesQuery = !query || haystack.indexOf(query) !== -1;
          var show = matchesValue && matchesQuery;
          row.hidden = !show;
          if (show) visible += 1;
        }
        for (var buttonIndex = 0; buttonIndex < buttons.length; buttonIndex += 1) {
          var isActive = buttons[buttonIndex].getAttribute('data-filter-value') === active;
          buttons[buttonIndex].setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
        if (status) status.textContent = 'Показано ' + visible + ' из ' + rows.length;
        if (empty) empty.hidden = visible !== 0;
      }

      for (var buttonIndex = 0; buttonIndex < buttons.length; buttonIndex += 1) {
        buttons[buttonIndex].addEventListener('click', function (event) {
          active = event.currentTarget.getAttribute('data-filter-value');
          applyFilter();
        });
      }
      if (search) search.addEventListener('input', applyFilter);
      applyFilter();
    })(scopes[scopeIndex]);
  }

  /* ---------- deep links into accordions ---------- */

  function openDetailsAround(target) {
    var node = target;
    while (node && node !== document.body) {
      if (node.tagName === 'DETAILS') node.open = true;
      node = node.parentElement;
    }
  }

  function followHash() {
    if (!window.location.hash) return;
    var target = null;
    try { target = document.querySelector(window.location.hash); } catch (error) { return; }
    if (!target) return;
    var hearingBlock = target.closest ? target.closest('[data-hearing]') : null;
    if (hearingBlock) {
      var hearing = hearingBlock.getAttribute('data-hearing');
      if (hearing === '1' || hearing === '2') setVersion(hearing);
    }
    openDetailsAround(target);
    window.setTimeout(function () {
      target.scrollIntoView({ block: 'start' });
    }, 30);
  }

  window.addEventListener('hashchange', followHash);
  followHash();

  /* ---------- to top ---------- */

  var toTop = document.getElementById('to-top');

  function updateToTop() {
    if (!toTop) return;
    toTop.hidden = window.scrollY < 700;
  }

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    updateToTop();
  }
})();
`
