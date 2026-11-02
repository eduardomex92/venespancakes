/* Vene's Pancake House – digital menu
   Loads menu.json and builds the page. To change prices or items,
   edit menu.json only; this file doesn't need to change. */

(function () {
  'use strict';

  const main = document.getElementById('menu');
  const tabList = document.getElementById('tab-list');
  const statusEl = document.getElementById('status');
  const toTop = document.getElementById('to-top');

  // Small helper: create an element, set text safely (never innerHTML).
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---------- Rendering ---------- */

  function renderItem(item) {
    const li = el('li', 'item');
    const info = el('div', 'item-info');
    info.append(el('p', 'item-name', item.name));
    if (item.desc) info.append(el('p', 'item-desc', item.desc));
    (item.extra || []).forEach(line => info.append(el('p', 'item-extra', line)));
    li.append(info);
    if (item.price) li.append(el('span', 'item-price', item.price));
    return li;
  }

  function renderItems(items) {
    const ul = el('ul', 'items');
    items.forEach(item => ul.append(renderItem(item)));
    return ul;
  }

  function renderPhotos(images, isFirstSection) {
    const band = el('div', 'photo-band' + (images.length > 1 ? ' multi' : ''));
    images.forEach(img => {
      const fig = el('figure');
      const image = el('img');
      image.src = img.src;
      image.alt = img.alt || '';
      image.decoding = 'async';
      // Only the first photo loads right away; the rest load as you scroll.
      image.loading = isFirstSection ? 'eager' : 'lazy';
      fig.append(image);
      if (img.caption) fig.append(el('figcaption', null, img.caption));
      band.append(fig);
    });
    return band;
  }

  function renderSection(section, index) {
    const sec = el('section', 'section' + (section.layout === 'compact' ? ' compact' : ''));
    sec.id = section.id;
    sec.setAttribute('aria-labelledby', section.id + '-title');

    if (section.images && section.images.length) {
      sec.append(renderPhotos(section.images, index === 0));
    }

    const head = el('div', 'section-head');
    const title = el('h2', 'section-title', section.title);
    title.id = section.id + '-title';
    head.append(title);
    if (section.price) head.append(el('span', 'section-price', section.price));
    sec.append(head);

    if (section.intro) sec.append(el('p', 'section-intro', section.intro));
    if (section.items) sec.append(renderItems(section.items));

    (section.groups || []).forEach(group => {
      const g = el('div', 'group');
      const gh = el('div', 'group-head');
      gh.append(el('h3', 'group-title', group.title));
      if (group.price) gh.append(el('span', 'group-price', group.price));
      g.append(gh);
      if (group.intro) g.append(el('p', 'group-intro', group.intro));
      g.append(renderItems(group.items || []));
      sec.append(g);
    });

    if (section.notes && section.notes.length) {
      const notes = el('div', 'notes');
      section.notes.forEach(n => notes.append(el('p', 'note', n)));
      sec.append(notes);
    }
    return sec;
  }

  function renderTabs(sections) {
    sections.forEach(section => {
      const li = el('li');
      const a = el('a', 'tab', section.tab || section.title);
      a.href = '#' + section.id;
      a.dataset.target = section.id;
      li.append(a);
      tabList.append(li);
    });
  }

  /* ---------- Active tab while scrolling ---------- */

  function setActiveTab(id) {
    let active = null;
    tabList.querySelectorAll('.tab').forEach(tab => {
      const on = tab.dataset.target === id;
      if (on) { tab.setAttribute('aria-current', 'true'); active = tab; }
      else tab.removeAttribute('aria-current');
    });
    // Keep the active tab visible in the horizontal tab bar
    // (scrolls the bar only, never the page).
    if (active) {
      const bar = tabList;
      const left = active.offsetLeft - (bar.clientWidth - active.offsetWidth) / 2;
      bar.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
  }

  function watchSections() {
    const sections = Array.from(main.querySelectorAll('.section'));
    // A section counts as "current" once its top passes just under the tab bar.
    const tabsH = document.querySelector('.tabs').offsetHeight;
    let current = null;

    function update() {
      const line = tabsH + 24;
      let found = sections[0];
      for (const s of sections) {
        if (s.getBoundingClientRect().top <= line) found = s;
        else break;
      }
      // At the very bottom of the page, highlight the last section.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        found = sections[sections.length - 1];
      }
      if (found && found.id !== current) {
        current = found.id;
        setActiveTab(current);
      }
      toTop.hidden = window.scrollY < 600;
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => { update(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Boot ---------- */

  function render(data) {
    const r = data.restaurant || {};
    if (r.name) {
      document.getElementById('brand-name').textContent = r.name;
      document.title = 'Menu · ' + r.name;
    }
    if (r.tagline) document.getElementById('brand-tagline').textContent = r.tagline;

    statusEl.remove();
    renderTabs(data.sections);
    data.sections.forEach((s, i) => main.append(renderSection(s, i)));
    watchSections();

    // If someone opens a link like menu/#lunch, jump to it after rendering.
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  }

  fetch('menu.json', { cache: 'no-cache' })
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(render)
    .catch(err => {
      console.error('Could not load menu.json:', err);
      statusEl.textContent = location.protocol === 'file:'
        ? 'Open this page through a local server (e.g. VS Code Live Server). Browsers block menu.json when the file is opened directly.'
        : 'Sorry, the menu could not be loaded. Please refresh the page.';
    });
})();
