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

## Architecture

- **Frontend:** static HTML/JS on GitHub Pages (no build step).
- **Backend:** [Supabase](https://supabase.com), which provides:
  - **Auth:** email and password, or an emailed sign-in link.
  - **Postgres:** watches, private financials, valuation history, photos index, custom references.
  - **Storage:** watch photos in a private bucket, one folder per user, served by signed URLs.
- **Privacy:** Row Level Security limits every row to its owner. Prices sit in a separate owner-only table (`watch_finance`), so they can never leak into a future public profile.
- **Signed out:** visitors see a read-only demo collection (`data/collection.json`) and the full catalog.

## Setup

1. **Database:** in the Supabase dashboard, open **SQL Editor → New query**, paste `supabase/schema.sql`, and run it. It is safe to re-run.
2. **Auth URLs:** under **Authentication → URL Configuration**:
   - Set **Site URL** to `https://boor3d.github.io/Rolex/`.
   - Add `http://localhost:8000/**` to **Redirect URLs** so local testing works.
3. **Hosting:** GitHub Pages deploys from `main`, folder `/ (root)`.

The project URL and publishable key are in `assets/js/supabase.js`. The publishable key is meant to be public. Never put the `service_role` / secret key in this repo.

**Free tier notes:**
- Supabase's built-in email sender is rate-limited (a few emails per hour). Before inviting many users, add custom SMTP under **Authentication → Emails** (e.g. Resend).
- Free projects pause after a week with no activity.

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
assets/js/store.js        Supabase data layer (load, save, photos, import/export)
assets/js/supabase.js     Supabase client + project config
supabase/schema.sql       tables, RLS policies, storage bucket
assets/js/dial.js         watch-face renderer
assets/js/vocab.js        families, metals, dials, bezels, bracelets
assets/js/views/*.js      one module per page
data/catalog.json         reference catalog
data/collection.json      demo collection shown to signed-out visitors
```

---

Not affiliated with Rolex SA. Rolex and all model names are trademarks of Rolex SA.
