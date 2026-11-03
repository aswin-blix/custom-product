# Custom Product Designer

> Working on the code? Read **[AGENTS.md](AGENTS.md)** first — full architecture,
> invariants, verification routine and open items for developers and coding agents.

A Next.js + Fabric.js clone of the all-over-print (AOP) **product designer** flow:
product page → **Start designing** → full-screen design maker → mockups → add to cart.

It is an original implementation of the same logic, driven by its own catalog and
assets (no third-party code or templates are copied).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (all routes prerender)
npm run lint
```

## Runs fully offline

Everything the designer needs is committed to the repo, so **no API key or network is required**:

| What | Where | Refresh with |
|---|---|---|
| Catalog data (products, variants, prices, print-file sizes, templates, mockup styles) | `data/printful/<id>/*.json` | `npm run printful:snapshot` (needs a key) |
| Design templates + product photos (70 files, ~6 MB) | `public/printful/assets/` | same script |
| Designer fonts (13 woff2) | `public/fonts/` + `src/app/fonts.css` | `npm run fonts:fetch` |

The loader prefers the snapshot; the live API is only used for a product that has no snapshot
*and* a configured key. The only feature that cannot run offline is Printful's **photo** Mockup
Generator (a remote renderer) — offline, the Mockups view shows previews built from the
downloaded templates instead.

## Preview on the real product (offline, built in)

The Mockups tab opens on a preview of the design projected onto the product photo
(on-model for garments): each placement's print is warped onto a hand-authored region of the
photo and multiplied with it, so folds, seams and shadows stay. Coordinates live in
`src/lib/photoPreviewConfig.ts`; tune them visually at `/dev/preview/<slug>`.

## Higher-fidelity photo mockups without the API (capture once, render locally)

Printful's photo mockups are reproduced locally with a **displacement map captured once**
from their generator: a white print gives the garment shading, a calibration print
(R = u, G = v, B = placement id) gives the exact warp and mask. At runtime the browser samples
the design through that map — no network, same photos/folds/seams.

```bash
npm run mockup:calibration                       # public/calibration/*.png (already committed)
# deploy (or tunnel) so /calibration is public, then:
npm run mockup:capture -- --base https://your-app.vercel.app   # needs PRINTFUL_API_KEY
git add public/mockups && git commit -m "Capture photo mockups" && git push   # redeploy
```

Output: `public/mockups/<id>/{manifest.json, <view>-photo.jpg, <view>-uv.png}` (~4 views per
product). The Mockups tab shows these first, then template previews. Until a product is
captured it shows template previews and says so.

Optional live generator (Option A) stays available: set `NEXT_PUBLIC_PRINTFUL_LIVE_MOCKUPS=1`,
`PRINTFUL_API_KEY` and `PUBLIC_BASE_URL`; it appears after the local previews.

## Deploy to Vercel

The app needs **no environment variables**. Push the repo to GitHub and import it in Vercel
(framework: Next.js, defaults are fine), or `npx vercel --prod` from the project folder.
Node 22+ is required. Catalog data is bundled via static imports
(`src/lib/printful/snapshot.generated.ts`, regenerate with `npm run snapshot:index` after a
snapshot refresh), so serverless functions never read the filesystem.

## Printful integration (optional: live catalog + photo mockups)

Create `.env.local` in the project root:

```
PRINTFUL_API_KEY=...        # Printful dashboard → Settings → Stores → API
PUBLIC_BASE_URL=https://…   # optional: a public origin (e.g. ngrok) so the Mockup Generator can fetch print files
```

With a key configured the app pulls, through Printful's official API:

| Data | Endpoint | Used for |
|---|---|---|
| Product, variants, prices, photos | `GET /products/{id}` | product page gallery, sizes, per-size price |
| Print-file sizes per placement | `GET /mockup-generator/printfiles/{id}` | canvas dimensions, 150 DPI export size |
| Design templates (outline, safe area, labels) | `GET /mockup-generator/templates/{id}` | canvas overlay — the same template images the design maker shows |
| Blank placement images, mockup styles | `GET /v2/catalog-products/{id}/images`, `/mockup-styles` | placement sizes in inches |
| Photo mockups | `POST /mockup-generator/create-task/{id}` + polling | Mockups view (needs `PUBLIC_BASE_URL`) |

Responses are cached on disk in `.cache/printful` for 24 h and the pages revalidate hourly.
Without a key (or if the API is unreachable) everything falls back to the built-in geometry and generated mockups.

The Mockup Generator only accepts URLs, so print files are hosted temporarily at
`/api/prints/{id}`. On localhost without `PUBLIC_BASE_URL` the Mockups view shows template-based
previews instead and explains why.

Catalog IDs: rash guard 301 · pajama top 827 · basic pillow 83 · oversized sweatshirt 1590 · boxy football jersey 1367 · minimalist backpack 389.

## Routes

| Route | What |
|---|---|
| `/` | Catalog of the six AOP products |
| `/custom/[slug]` | Product page (gallery, rating, technique, size, price, **Start designing**) |
| `/design/[slug]` | The design maker (client-only, loaded without SSR) |

Products (see `src/lib/catalog.ts`): men's rash guard, women's long-sleeve pajama top,
basic pillow, oversized cotton sweatshirt, boxy football jersey, minimalist backpack.

## Designer logic

| Area | Behaviour |
|---|---|
| Rail | Product · Layers · Uploads · Text · Clipart · Quick Designs · Premium · Fill |
| Placements | One Fabric canvas per placement (Front / Back / sleeves / sides); all stay mounted so switching never loses work |
| Template | Panel outline + lighter bleed outside the panel + dashed **Safe Print Area** (+ *Collar* label on body panels) |
| Layers | Thumbnail, type badge, print quality (`Good / Vector`, or DPI-based Good / Ok / Poor), width × height in inches, lock, menu (duplicate, reorder, delete). Quick designs show as a group with the nested clipart tile; **Background fill** row at the bottom |
| Context tools | **Transform** (rotate, W/H with linked ratio, flip) · **Position** (6 aligns) · **Pattern** (none / grid / half-drop / half-brick / mirror / row / column, tile size, spacing, offset) · **Text** (font, size, colour, align, spacing, outline) |
| Quick Designs | Tiled pattern + background colour applied to every placement |
| Fill | Colours / Graphics / Patterns / Premium, "Apply background to all placements" |
| Uploads | Drag-drop or picker; PNG/JPG/WEBP/GIF/SVG; reusable across placements |
| Undo / Redo | Per-placement JSON snapshots (Ctrl+Z / Ctrl+Y); Delete, Ctrl+D, arrow-nudge |
| Mockups | Requires a stitch colour (modal) the first time; prints are composited onto panel geometry with fabric shading and stitch lines |
| Add to cart | Enabled once any placement has a design; shows 150 DPI print files per placement and the order payload |

## Where things live

```
src/lib/catalog.ts       products, placements, dimensions, DPI constants
src/lib/templates.ts     cut-and-sew panel paths (body, sleeve, square, backpack, side)
src/lib/engine.ts        Fabric wrapper: layers, patterns, fills, snapshots, export
src/lib/pattern.ts       tile-mode source builder (half-drop, mirror, …)
src/lib/mockup.ts        compositor that maps print files onto the product
src/lib/cliparts.ts      inline SVG clipart library
src/lib/quickDesigns.ts  pattern presets (tile + background)
src/store/designer.ts    Zustand UI state (tool, placement, history, uploads …)
src/components/designer  shell, canvas, panels, context tools, mockups, modals
```

Print files are exported at **150 DPI** (`PX_PER_INCH = 40` on canvas → ×3.75 on export).

## Connecting a fulfilment API

The cart modal's payload (`product`, `variant`, per-placement print size) is the shape a
print-on-demand order needs. Swap the catalog for live catalog/placement data and post
the generated PNGs to your provider's order endpoint.
