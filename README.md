# Vene's Pancake House – Digital Menu

A single-page, mobile-first menu. Plain HTML, CSS and JavaScript, no build step, hosted free on GitHub Pages. The menu content comes from a Google Sheet, so the restaurant can change prices and dishes without touching code.

## Files

```
index.html     page shell (header, tab bar, footer)
styles.css     all styling; brand colors are at the top in :root
app.js         loads the sheet and builds the menu (start with the comment at the top)
data/          local copies of the 4 sheet tabs as CSV (backup + development)
images/        WebP photos and logo
```

## The Google Sheet

Import `venes_menu_google_sheet.xlsx` (sent alongside this folder; keep it out of the GitHub repo) into Google Sheets. It has a **how to edit** tab for the owner, plus 4 data tabs:

| Tab | One row per | Columns |
|---|---|---|
| `items` | dish | `id`, `category_id`, `group`, `name`, `description`, `price`, `extra`, `image`, `image_alt`, `available`, `display_order` |
| `categories` | menu section (a tab on the page) | `id`, `tab`, `title`, `price`, `intro`, `notes`, `layout`, `display_order` |
| `groups` | sub-heading inside a section | `category_id`, `group`, `price`, `intro`, `display_order` |
| `banners` | banner photo | `category_id`, `image`, `alt`, `label`, `display_order` |

How it fits together:

- Everything links by **`category_id`** → the `id` in `categories`. The sheet has a dropdown for it.
- A dish joins a group when its `group` cell matches a `group` in the `groups` tab exactly. If it doesn't match (a typo), the dish still shows, just not under that heading.
- A section's `price` (e.g. $13.00 for Omelettes) lives **only** in `categories` and shows on the banner. Dishes in that section leave `price` blank.
- **2+ banner rows** for the same section = swipeable photos with dots. No banner rows = a plain brown card. `label` is an optional chip on the photo.
- `extra` (items) and `notes` (categories) can hold several lines separated by `|`.
- `available` unticked = dish hidden. A group or section whose dishes are all hidden disappears too.
- `layout` = `compact` gives tighter rows (drinks, sides).
- Prices are text, shown exactly as typed: `$9.00`, `+$4.00`, `from $8.00`.

**Don't rename the tabs or the row-1 headers.** The code finds the data by those names.

## Connecting the sheet (one time)

1. Google Sheets → **File → Import → Upload** `venes_menu_google_sheet.xlsx` → **Replace spreadsheet**.
2. On the `items` tab, select the `available` column (from row 2 down) → **Insert → Checkbox**. Existing TRUE values become ticked boxes.
3. **File → Share → Publish to web**. In the first dropdown pick the **items** tab, in the second pick **Comma-separated values (.csv)** → **Publish**. Copy the link.
4. Repeat step 3 for `categories`, `groups` and `banners`. That's 4 links, one per tab.
5. Paste them into `SHEET_URLS` at the top of `app.js`:
   ```js
   const SHEET_URLS = {
     items: 'https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv',
     categories: '...',
     groups: '...',
     banners: '...',
   };
   ```
6. Push to GitHub. Done.

Notes:
- Google caches published sheets, so edits take **about 5 minutes** to appear on the site.
- Keep "Automatically republish when changes are made" ticked in the Publish to web dialog (it's on by default).
- The published CSV is public (anyone with the link can read it). That's fine for a menu, but don't put anything private in this sheet.

## Backup copy (`data/`)

If Google can't be reached, the page loads the CSV files in `data/` instead, so customers never see an empty menu. They may be a little out of date, so refresh them now and then (for example after a price change):

**File → Download → Comma-separated values** on each tab, rename to `items.csv`, `categories.csv`, `groups.csv`, `banners.csv`, and replace the files in `data/`.

While `SHEET_URLS` are empty, the page always uses `data/`, which is handy for working offline.

## Adding photos

1. Export from Canva as PNG.
2. Size it for where it goes, then convert to WebP at https://squoosh.app:
   - **Banner slides:** landscape 16:9, about 1200×675, under ~80 KB. The card crops to fill, so keep the food away from the very edges, and leave the bottom-left fairly plain (the title sits there).
   - **Dish thumbnails:** square, about 240×240. A close crop of the food looks best at that size.
3. Upload the file to `images/` on GitHub, then type its path in the sheet (`images/hero-….webp` in `banners`, `images/thumb-….webp` in the `image` column of `items`).

Photos live on GitHub, not in the sheet, so a new photo needs a push. Changing which existing photo is used only needs the sheet.

## Testing locally

The menu is loaded with `fetch`, which browsers block when you open `index.html` directly from your file system. Use a local server:

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
