/* =====================================================================
   VENE'S PANCAKE HOUSE MENU — APP LOGIC (v3)

   The big picture:
     1. Download the 4 tabs of the Google Sheet as CSV (items, categories,
        groups, banners). If Google can't be reached, use the copies in data/.
     2. Turn those flat rows into nested "sections" (BUILD SECTIONS).
     3. Build the tab bar and one <section> per category.
     4. Wire up the behavior: swipeable banner photos, the active tab
        while scrolling, and the back-to-top button.

   Search for these labels to find each part:
     - CONFIG ............. the Google Sheet links go here
     - LOAD + PARSE ....... downloading and reading the CSV files
     - BUILD SECTIONS ..... rows → the shape the render code expects
     - BANNER CARDS ....... photo card at the top of each section (swipeable)
     - ITEM PHOTOS ........ optional small photo next to a dish
     - SWIPE DOTS ......... the dots that follow the swipe

   To change prices or dishes, edit the Google Sheet. This file
   doesn't need to change.
   ===================================================================== */

// An IIFE ("immediately invoked function expression"): the whole file runs
// inside one function, so our variables don't leak into the global scope
// where they could clash with other scripts.
(function () {
  'use strict'; // stricter JS: typos like undeclared variables throw errors instead of failing silently

  /* ---------- CONFIG ----------
     Paste each tab's "Publish to web → CSV" link here (see README).
     Leave them as "" while developing: the copies in data/ are used. */
  const SHEET_URLS = {
    items: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRKU5JcRNBlCn1OpLtMNthYQiSVyCS_Fcc1tIHjyO26HAwQdFZenrw36KNAOHclXZplnoDmUXHS3PRY/pub?gid=169005898&single=true&output=csv',
    categories: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRKU5JcRNBlCn1OpLtMNthYQiSVyCS_Fcc1tIHjyO26HAwQdFZenrw36KNAOHclXZplnoDmUXHS3PRY/pub?gid=78268274&single=true&output=csv',
    groups: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRKU5JcRNBlCn1OpLtMNthYQiSVyCS_Fcc1tIHjyO26HAwQdFZenrw36KNAOHclXZplnoDmUXHS3PRY/pub?gid=1751099437&single=true&output=csv',
    banners: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRKU5JcRNBlCn1OpLtMNthYQiSVyCS_Fcc1tIHjyO26HAwQdFZenrw36KNAOHclXZplnoDmUXHS3PRY/pub?gid=1352908352&single=true&output=csv',
  };

  // Separator for several lines in one cell ("Add cheese +$1.00 | Choice of toast").
  const LINE_SEPARATOR = '|';

  // Grab the page elements we need once, up front.
  const main = document.getElementById('menu');
  const tabList = document.getElementById('tab-list');
  const statusEl = document.getElementById('status');
  const toTop = document.getElementById('to-top');


  /* ---------- HELPER ----------
     el('p', 'item-name', 'Ham') → <p class="item-name">Ham</p>
     We use textContent (never innerHTML) for text from the sheet, so a
     typo like "<b" in a cell can never break the page or inject code. */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;   // "!= null" skips both null and undefined
    return node;
  }


  /* =====================================================================
     BANNER CARDS
     A section's banner photos (banners tab) become a card made of layers
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

    // ITEM PHOTOS: only dishes with an "image" in the sheet get one.
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
    // Drinks and sides use layout "compact" in the sheet → tighter rows.
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
     LOAD + PARSE
     ===================================================================== */

  // Download one CSV file as text. "async" lets us use "await" inside,
  // which pauses this function (not the page) until the download finishes.
  async function loadCsv(url) {
    // no-store: never reuse an old copy, so price changes show up.
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Download failed for ${url}: HTTP ${res.status}`);
    return res.text();
  }

  /* CSV → array of rows, each row an array of cells.
     We can't just split on commas: a description like "Bacon, lettuce, tomato"
     is wrapped in quotes in the CSV, and its commas belong to the text.
     So we read one character at a time and track whether we're inside quotes. */
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"' && text[i + 1] === '"') { field += '"'; i++; } // "" = a literal quote
        else if (char === '"') inQuotes = false;                        // closing quote
        else field += char;                                             // commas/newlines are just text here
      } else {
        if (char === '"') inQuotes = true;                               // opening quote
        else if (char === ',') { row.push(field); field = ''; }          // end of a cell
        else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; } // end of a row
        else if (char !== '\r') field += char;                           // ignore Windows "\r"
      }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); } // last row (no trailing newline)
    return rows;
  }

  /* Rows → objects, using row 1 as the keys:
       ["id","name"], ["lunch-001","BLT Wrap"]  →  { id: "lunch-001", name: "BLT Wrap" }
     Generic: it works for all 4 tabs because it knows nothing about menus. */
  function rowsToObjects(rows) {
    if (rows.length === 0) return [];
    const headers = rows[0].map(h => h.trim().toLowerCase());
    return rows.slice(1)
      .map(values => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (values[i] || '').trim(); });
        return obj;
      })
      // Skip blank rows (every cell empty), which Sheets often leaves at the end.
      .filter(obj => Object.values(obj).some(v => v !== ''));
  }

  // Download and parse all 4 tabs. "source" is either SHEET_URLS or local files.
  async function loadTables(source) {
    const names = ['items', 'categories', 'groups', 'banners'];
    // Promise.all starts all 4 downloads at the same time and waits for all
    // of them. The results come back in the same order as "names".
    const texts = await Promise.all(names.map(n => loadCsv(source[n])));
    const tables = {};
    names.forEach((n, i) => { tables[n] = rowsToObjects(parseCsv(texts[i])); });
    return tables;
  }


  /* =====================================================================
     BUILD SECTIONS
     The sheet is "flat" (4 separate lists). The render code expects
     "nested" data: each section holds its slides, items and groups.
     This function is the bridge (often called an "adapter"), which is why
     none of the render code had to change when we moved from JSON to Sheets.
     ===================================================================== */

  // "1" → 1. A blank or typo'd order goes to the end instead of breaking the sort.
  function orderOf(row) {
    const n = Number(row.display_order);
    return Number.isFinite(n) && row.display_order !== '' ? n : Infinity;
  }
  // .sort() changes the array; [...list] sorts a copy instead.
  function byOrder(list) {
    return [...list].sort((a, b) => orderOf(a) - orderOf(b));
  }
  // "Add cheese +$1.00 | Choice of toast" → ["Add cheese +$1.00", "Choice of toast"]
  function splitLines(text) {
    return (text || '').split(LINE_SEPARATOR).map(s => s.trim()).filter(Boolean);
  }
  // A Sheets checkbox exports as TRUE / FALSE. Only an explicit FALSE hides a
  // dish, so a row where someone forgot the checkbox still shows.
  function isAvailable(item) {
    return (item.available || '').toUpperCase() !== 'FALSE';
  }

  // One sheet row → the item shape renderItem() uses.
  function toItem(row) {
    return {
      name: row.name,
      desc: row.description,
      price: row.price,
      extra: splitLines(row.extra),
      image: row.image ? { src: row.image, alt: row.image_alt } : null,
    };
  }

  function buildSections(tables) {
    const items = byOrder(tables.items).filter(it => it.name && isAvailable(it));

    return byOrder(tables.categories)
      .filter(cat => cat.id)
      .map(cat => {
        // Everything that belongs to this category, matched by its id.
        const mine = list => list.filter(row => row.category_id === cat.id);
        const catItems = mine(items);

        // Groups listed in the groups tab, each holding the items whose
        // "group" cell matches its name.
        const groups = byOrder(mine(tables.groups))
          .map(g => ({
            title: g.group,
            price: g.price,
            intro: g.intro,
            items: catItems.filter(it => it.group === g.group).map(toItem),
          }))
          .filter(g => g.items.length > 0);   // hide a group if all its dishes are hidden

        return {
          id: cat.id,
          tab: cat.tab,
          title: cat.title || cat.id,
          price: cat.price,
          intro: cat.intro,
          notes: splitLines(cat.notes),
          layout: cat.layout,
          slides: byOrder(mine(tables.banners))
            .filter(b => b.image)
            .map(b => ({ src: b.image, alt: b.alt, label: b.label })),
          // Dishes with no group, or with a group name that isn't in the
          // groups tab (a typo), are listed straight under the section,
          // so a typo never makes a dish disappear.
          items: catItems
            .filter(it => !groups.some(g => g.title === it.group))
            .map(toItem),
          groups,
        };
      })
      // Skip a section with nothing in it (e.g. every dish unticked).
      .filter(s => s.items.length > 0 || s.groups.length > 0);
  }


  /* =====================================================================
     START
     ===================================================================== */
  function render(sections) {
    statusEl.remove();   // remove "Loading menu…"
    renderTabs(sections);
    sections.forEach((s, i) => main.append(renderSection(s, i)));

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

  const LOCAL_FILES = {
    items: 'data/items.csv',
    categories: 'data/categories.csv',
    groups: 'data/groups.csv',
    banners: 'data/banners.csv',
  };

  async function start() {
    // Use the sheet only if ALL 4 links were pasted in.
    const useSheet = Object.values(SHEET_URLS).every(url => url !== '');
    let tables;

    // try/catch: if anything inside "try" throws (no internet, Google down,
    // a tab unpublished), we jump to "catch" instead of crashing.
    try {
      tables = await loadTables(useSheet ? SHEET_URLS : LOCAL_FILES);
    } catch (err) {
      if (!useSheet) throw err;   // local files failed too: nothing to fall back to
      // FALLBACK: Google failed, so show the copy in data/. It may be a
      // little out of date, but a slightly old menu beats an empty page.
      console.warn('Google Sheet unavailable, using local copy:', err);
      tables = await loadTables(LOCAL_FILES);
    }
    render(buildSections(tables));
  }

  // start() returns a Promise; .catch handles any error it didn't handle itself.
  start().catch(err => {
    console.error('Could not load the menu:', err);
    // Opening index.html by double-click uses file://, where browsers block fetch().
    statusEl.textContent = location.protocol === 'file:'
      ? 'Open this page through a local server (e.g. VS Code Live Server). Browsers block the menu files when the page is opened directly.'
      : 'Sorry, the menu could not be loaded. Please refresh the page.';
  });
})();
