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
| `price` | section or group | One shared price shown next to the heading |
| `intro` | section or group | Muted sentence under the heading |
| `images` | section | Photo band; add `caption` for a label under each photo |
| `groups` | section | Sub-lists with their own small heading |
| `extra` | item | Extra muted lines under the description |
| `notes` | section | Small italic lines at the end of the section |
| `layout: "compact"` | section | Tighter rows (used for drinks and sides) |

If the page shows "menu could not be loaded" after an edit, the JSON probably has a typo. Paste it into https://jsonlint.com to find it.

## Adding photos

1. Export from Canva as PNG (transparent background works best).
2. Convert to WebP, around 600–800px wide (https://squoosh.app works well).
3. Put the file in `images/` and reference it in `menu.json`.

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
