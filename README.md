# Vene's Pancake House – Digital Menu

A single-page, mobile-first menu. Plain HTML, CSS and JavaScript, no build step, hosted free on GitHub Pages.

## Files

```
index.html     page shell (header, tab bar, footer)
styles.css     all styling; brand colors are at the top in :root
app.js         reads menu.json and builds the menu + sticky tabs
menu.json      ALL menu content: sections, items, prices, notes
images/        WebP photos and logo
```

## Editing the menu

Only `menu.json` needs to change for prices or items.

- **Change a price:** find the item and edit `"price": "$11.00"`.
- **Add an item:** copy an existing `{ "name": ..., "desc": ..., "price": ... }` line inside the same `items` list. Watch the commas between items.
- **Add a section:** copy a whole section object. Give it a unique `id` (lowercase, dashes) and a short `tab` label.

Optional fields:

| Field | Where | What it does |
|---|---|---|
| `price` | section or group | One shared price (a pill on the banner card for sections) |
| `intro` | section or group | Muted sentence under the heading |
| `slides` | section | Banner card photos. 2+ photos = swipeable with dots. Each is `{ "src", "alt", "label" }`; `label` is an optional chip on the photo. No slides = a plain brown card |
| `image` | item | Small square photo next to the dish: `{ "src": "images/thumb-x.webp", "alt": "..." }` |
| `groups` | section | Sub-lists with their own small heading |
| `extra` | item | Extra muted lines under the description |
| `notes` | section | Small italic lines at the end of the section |
| `layout: "compact"` | section | Tighter rows (used for drinks and sides) |

If the page shows "menu could not be loaded" after an edit, the JSON probably has a typo. Paste it into https://jsonlint.com to find it.

## Adding photos

1. Export from Canva as PNG.
2. Size it for where it goes, then convert to WebP at https://squoosh.app:
   - **Banner slides:** landscape 16:9, about 1200×675, under ~80 KB. The card crops to fill, so keep the food away from the very edges, and leave the bottom-left fairly plain (the title sits there).
   - **Dish thumbnails:** square, about 240×240. A close crop of the food looks best at that size.
3. Put the file in `images/` and reference it in `menu.json` (`hero-…` for banners, `thumb-…` for dishes).

The current banners were made from the Canva cutouts by placing each plate on a soft blush background. Real photos of the dishes work just as well.

## Testing locally

`menu.json` is loaded with `fetch`, which browsers block when you open `index.html` directly from your file system. Use a local server:

- VS Code: install **Live Server**, right-click `index.html` → "Open with Live Server"
- Or in a terminal: `python3 -m http.server` then open http://localhost:8000

## Publishing on GitHub Pages

1. Create a new public repository on GitHub, e.g. `venes-menu`.
2. Upload these files (drag and drop on the repo page, or `git push`).
3. In the repo: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main**, folder **/ (root)** → Save
4. After a minute the menu is live at `https://<your-username>.github.io/venes-menu/`.

### Custom domain (recommended for QR codes)

1. In **Settings → Pages → Custom domain**, enter e.g. `menu.venespancakes.com`.
2. At the domain's DNS provider, add a **CNAME** record: `menu` → `<your-username>.github.io`.
3. Once it verifies, tick **Enforce HTTPS**.

Point the printed QR codes at the custom domain. If hosting ever changes again, only the DNS changes, and the QR codes keep working.

### Linking to a section

Every section has an anchor, e.g. `.../#lunch` or `.../#drinks`.
