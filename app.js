/* =====================================================================
   VENE'S PANCAKE HOUSE MENU — APP LOGIC (v2)

   The big picture:
     1. Download menu.json (all the menu content).
     2. Build the tab bar and one <section> per category from that data.
     3. Wire up the behavior: swipeable banner photos, the active tab
        while scrolling, and the back-to-top button.

   NEW in v2. Search for these labels to find each part:
     - BANNER CARDS ....... photo card at the top of each section (swipeable)
     - ITEM PHOTOS ........ optional small photo next to a dish
     - SWIPE DOTS ......... the dots that follow the swipe

   To change prices or dishes, edit menu.json only. This file
   doesn't need to change.
   ===================================================================== */

// An IIFE ("immediately invoked function expression"): the whole file runs
// inside one function, so our variables don't leak into the global scope
// where they could clash with other scripts.
(function () {
  'use strict'; // stricter JS: typos like undeclared variables throw errors instead of failing silently

  // Grab the page elements we need once, up front.
  const main = document.getElementById('menu');
  const tabList = document.getElementById('tab-list');
  const statusEl = document.getElementById('status');
  const toTop = document.getElementById('to-top');


  /* ---------- HELPER ----------
     el('p', 'item-name', 'Ham') → <p class="item-name">Ham</p>
     We use textContent (never innerHTML) for text from menu.json, so a
     typo like "<b" in the JSON can never break the page or inject code. */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;   // "!= null" skips both null and undefined
    return node;
  }


  /* =====================================================================
     BANNER CARDS
     A section's "slides" list in menu.json becomes a card made of layers
     (the stacking is done in styles.css with position: absolute):
       1. .hero-track   a row of photos you can swipe sideways
       2. ::after       a dark gradient so white text is readable on any photo
       3. .hero-text    the section title and shared price
       4. .hero-dots    one dot per photo (only when there are 2+ photos)
     A section with no slides gets a plain brown card instead.
     ===================================================================== */
  function renderHero(section, isFirstSection) {
    const slides = section.slides || [];   // "|| []" = no slides key? use an empty list
    const card = el('div', slides.length ? 'hero' : 'hero no-photo');

    // Layer 1: the photo strip. Only built when there are photos.
    if (slides.length) {
      const track = el('div', 'hero-track');
      slides.forEach((slide, i) => {
        const fig = el('figure', 'hero-slide');
        const img = el('img');
        img.src = slide.src;
        img.alt = slide.alt || '';
        img.draggable = false;     // stops desktop browsers "picking up" the photo on click-drag
        img.decoding = 'async';    // decode off the main thread so scrolling stays smooth
        // The very first photo on the page loads right away (it's on screen);
        // every other photo waits until the customer scrolls close to it.
        img.loading = isFirstSection && i === 0 ? 'eager' : 'lazy';
        fig.append(img);
        // Optional label chip on the photo, e.g. "Burrito" / "Bowl"
        if (slide.label) fig.append(el('span', 'slide-label', slide.label));
        track.append(fig);
      });
      card.append(track);
    }

    // Layer 3: title + price, pinned to the bottom of the card.
    const text = el('div', 'hero-text');
    const title = el('h2', 'hero-title', section.title);
    title.id = section.id + '-title';   // the <section> points to this with aria-labelledby
    text.append(title);
    if (section.price) text.append(el('span', 'hero-price', section.price));
    card.append(text);

    // Layer 4: dots, only when there's something to swipe to.
    if (slides.length > 1) {
      const dots = el('div', 'hero-dots');
      slides.forEach((slide, i) => {
        const dot = el('button', 'hero-dot' + (i === 0 ? ' active' : ''));
        dot.type = 'button';   // a <button> defaults to type="submit"; "button" is the safe habit
        dot.dataset.index = i; // stored as data-index="1"; read back later in setupSwipeDots
        dot.setAttribute('aria-label', `Photo ${i + 1} of ${slides.length}`);
        dots.append(dot);
      });
      card.append(dots);
    }
    return card;
  }


  /* =====================================================================
     SWIPE DOTS
     Swiping itself needs NO JavaScript: the browser does it with CSS
     scroll-snap (see .hero-track in styles.css). This only:
       1. moves the "active" dot when the photos are swiped
       2. scrolls to a photo when its dot is tapped (handy on desktop)
     ===================================================================== */
  function setupSwipeDots() {
    document.querySelectorAll('.hero').forEach(card => {
      const track = card.querySelector('.hero-track');
      const dots = card.querySelectorAll('.hero-dot');
      if (!track || dots.length === 0) return;   // nothing to swipe on this card

      // 1. Swipe → update dots.
      // scrollLeft = how far the strip has scrolled, in pixels.
      // clientWidth = the width of one photo (= the card width).
      // Example: card 350px wide, scrolled 350px → 350 / 350 = index 1 (photo 2).
      // { passive: true } promises we won't block scrolling, keeping swipes smooth.
      track.addEventListener('scroll', () => {
        const index = Math.round(track.scrollLeft / track.clientWidth);
        dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
      }, { passive: true });

      // 2. Tap a dot → scroll to its photo.
      // dataset values are always strings, so Number() converts "1" → 1.
      dots.forEach(dot => {
        dot.addEventListener('click', () => {
          const index = Number(dot.dataset.index);
          track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
        });
      });
    });
  }


  /* =====================================================================
     ITEMS (one row per dish)
     ===================================================================== */
  function renderItem(item) {
    const li = el('li', 'item');

    // ITEM PHOTOS: only dishes with an "image" in menu.json get one.
    // The extra class "has-photo" lets the CSS adjust the row layout.
    if (item.image) {
      li.classList.add('has-photo');
      const img = el('img', 'item-photo');
      img.src = item.image.src;
      img.alt = item.image.alt || item.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 76;    // width/height in the HTML reserve the space before the photo
      img.height = 76;   // arrives, so the text below doesn't jump when it loads
      li.append(img);
    }

    // Body: name + price on one line, then description and extra lines.
    const body = el('div', 'item-body');
    const head = el('div', 'item-head');
    head.append(el('p', 'item-name', item.name));
    if (item.price) head.append(el('span', 'item-price', item.price));
    body.append(head);

    if (item.desc) body.append(el('p', 'item-desc', item.desc));
    // "extra" is an optional list of small lines (add-ons, upgrades).
    (item.extra || []).forEach(line => body.append(el('p', 'item-extra', line)));

    li.append(body);
    return li;
  }

  function renderItems(items) {
    const ul = el('ul', 'items');
    items.forEach(item => ul.append(renderItem(item)));
    return ul;
  }


  /* =====================================================================
     SECTIONS
     ===================================================================== */
  function renderSection(section, index) {
    // Drinks and sides use layout: "compact" in menu.json → tighter rows.
    const sec = el('section', 'section' + (section.layout === 'compact' ? ' compact' : ''));
    sec.id = section.id;                                         // what the tab links to (#lunch)
    sec.setAttribute('aria-labelledby', section.id + '-title');  // screen readers announce the title

    sec.append(renderHero(section, index === 0));
    if (section.intro) sec.append(el('p', 'section-intro', section.intro));
    if (section.items) sec.append(renderItems(section.items));

    // Groups = sub-lists inside a section ("Fresh Eggs", "Add-ons"...).
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

    // Small italic notes at the end ("No substitutions").
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
      // "tab" is the short label for the bar; fall back to the full title.
      const a = el('a', 'tab', section.tab || section.title);
      a.href = '#' + section.id;
      a.dataset.target = section.id;
      li.append(a);
      tabList.append(li);
    });
  }


  /* =====================================================================
     ACTIVE TAB while scrolling
     ===================================================================== */
  function setActiveTab(id) {
    let active = null;
    tabList.querySelectorAll('.tab').forEach(tab => {
      const on = tab.dataset.target === id;
      // aria-current tells screen readers which tab is current;
      // the CSS also uses it to color the active tab.
      if (on) { tab.setAttribute('aria-current', 'true'); active = tab; }
      else tab.removeAttribute('aria-current');
    });

    // Slide the tab BAR sideways so the active tab is centered.
    // We scroll only the bar (not scrollIntoView), so the page itself never jumps.
    if (active) {
      const left = active.offsetLeft - (tabList.clientWidth - active.offsetWidth) / 2;
      tabList.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
  }

  function watchSections() {
    const sections = Array.from(main.querySelectorAll('.section'));
    const tabsH = document.querySelector('.tabs').offsetHeight;
    let current = null;

    // The "current" section is the last one whose top has scrolled
    // above a line just under the sticky tab bar.
    function update() {
      const line = tabsH + 24;
      let found = sections[0];
      for (const s of sections) {
        if (s.getBoundingClientRect().top <= line) found = s;
        else break;   // sections are in order, so we can stop early
      }
      // At the very bottom, the last sections may be too short to reach the
      // line, so highlight the last one.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        found = sections[sections.length - 1];
      }
      if (found && found.id !== current) {   // only touch the DOM when it actually changes
        current = found.id;
        setActiveTab(current);
      }
      toTop.hidden = window.scrollY < 600;   // show "back to top" after scrolling a bit
    }

    // Scroll events fire many times per frame. requestAnimationFrame + the
    // "ticking" flag make update() run at most once per frame (a "throttle").
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


  /* =====================================================================
     START
     ===================================================================== */
  function render(data) {
    const r = data.restaurant || {};
    if (r.name) {
      document.getElementById('brand-name').textContent = r.name;
      document.title = 'Menu · ' + r.name;
    }
    if (r.tagline) document.getElementById('brand-tagline').textContent = r.tagline;

    statusEl.remove();   // remove "Loading menu…"
    renderTabs(data.sections);
    data.sections.forEach((s, i) => main.append(renderSection(s, i)));

    // Listeners can only be attached to elements that exist, so these run
    // AFTER the sections are on the page.
    setupSwipeDots();
    watchSections();

    // Someone opened a link like .../#lunch: the section didn't exist when the
    // page first loaded, so jump to it now that it does.
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  }

  // fetch() returns a Promise: .then runs when the download finishes,
  // .catch runs if anything along the way throws an error.
  fetch('menu.json', { cache: 'no-cache' })   // no-cache: always check for a newer menu.json
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);   // e.g. 404 if the file is missing
      return res.json();                                    // parse the text into a JS object
    })
    .then(render)
    .catch(err => {
      console.error('Could not load menu.json:', err);
      // Opening index.html by double-click uses file://, where browsers block fetch().
      statusEl.textContent = location.protocol === 'file:'
        ? 'Open this page through a local server (e.g. VS Code Live Server). Browsers block menu.json when the file is opened directly.'
        : 'Sorry, the menu could not be loaded. Please refresh the page.';
    });
})();
