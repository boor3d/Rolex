# The Collection — a Rolex collection site

A static site for showing a Rolex collection: references, metals, dials, bracelets, purchase prices and estimated values. It includes a catalog of 268 references across 26 families (1930s Bubblebacks through the 2026 releases) and an insights page that shows how much of the catalog the collection covers.

It runs on GitHub Pages with no build step or server.

## Pages

| Page | What it shows |
|---|---|
| **Collection** | Summary figures, a featured piece, and a grid or table of every watch with filters and sorting |
| **Watch** | Spec sheet, cost vs. estimate, annualised return, photos, and where the reference sits in its family's production history |
| **Catalog** | Every reference grouped by family, with coverage meters, or as a production timeline from 1926 to today |
| **Reference** | Production run, calibre, and the dial and bracelet options (the drawing updates when you switch them) |
| **Insights** | Family coverage, metals, bracelets, bezels, the dial colours you own, eras, value by family, and suggested gaps to fill |
| **Add / Edit** | Search the catalog to fill in the specs, upload photos, live preview |

Each watch is drawn from its specification (case metal, bezel type and colours, dial colour, bracelet), so no copyrighted press photos are needed. You can upload your own photos for any watch.

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. In the repository, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, and choose `main` / `/ (root)`.
3. The site goes live at `https://<user>.github.io/<repo>/` within a minute or two.

## How your data works

- **`data/collection.json`** is the published collection that every visitor sees.
- **Edits you make on the site** (adding watches, photos, custom references) are saved in your browser (IndexedDB). An **Unpublished** marker appears in the header.
- To publish them, go to **Settings → Download collection.json**, replace `data/collection.json` in the repo with the download, and push. You can leave prices, photos or notes out of the published file.
- **Download full backup** keeps a complete copy, and **Import** restores it in any browser.

> GitHub Pages sites are public. Anything in `data/collection.json` can be read by anyone with the link. Don't publish serial numbers, and untick prices on export if you want them private.

## The catalog

`data/catalog.json` holds the reference data. Each entry looks like this:

```json
{"ref":"126610LV","family":"submariner","model":"Submariner Date","nick":"Starbucks","from":2020,"to":null,
 "size":41,"metal":"steel","bezel":"dive:green","dials":["black"],"bracelets":["oyster"],"caliber":"3235"}
```

- **Bezel codes:** `smooth`, `fluted`, `engine`, `dive:<colour>`, `gmt:<top>/<bottom>`, `tachy:<colour>`, `e2`, `ym:<colour>`, `regatta:<colour>`, `turn:<colour>`.
- **Allowed values** for metals, dial colours, bracelets and families are listed in `assets/js/vocab.js`.
- **Production years** are approximate. Dial lists show the main options, not every factory variant, and gem-set references are left out.
- **Adding a missing reference:** use **Catalog → Add a reference** on the site (it's saved with your collection), or edit `data/catalog.json` directly.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly as a file won't work; the site has to be served.)

## Structure

```
index.html
assets/css/styles.css
assets/js/app.js          router + theme
assets/js/store.js        published data + browser edits, export and import
assets/js/dial.js         watch-face renderer
assets/js/vocab.js        families, metals, dials, bezels, bracelets
assets/js/views/*.js      one module per page
data/catalog.json         reference catalog
data/collection.json      your published collection
```

---

Not affiliated with Rolex SA. Rolex and all model names are trademarks of Rolex SA.
