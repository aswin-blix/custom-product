# Agent handoff: Custom Product Designer

Read this before changing anything. It explains what the project is, how every
part works, the invariants you must keep, how to verify changes, and what is
still open. `README.md` is the user-facing summary; this file is the engineering
reference.

## 1. What this is

A Next.js 16 + Fabric.js 7 clone of the all-over-print (AOP) product-designer
flow of a print-on-demand site: product page → **Start designing** → full-screen
design maker (placements, layers, patterns, text, fill, mockups) → add to cart
with 150 DPI print files.

Six catalog products are supported (Printful catalog ids in brackets):
men's rash guard (301), women's long-sleeve pajama top (827), basic pillow (83),
oversized cotton sweatshirt (1590), boxy football jersey (1367), minimalist
backpack (389).

**Ground rules that shaped the code (keep them):**

- The designer's *behaviour* is cloned by observation; no third-party designer
  code is copied. Catalog data, template images and product photos come from
  Printful's **official API** (with the owner's token) — never scraped from the
  website. `rea` or any reverse-engineering of their bundles is out of scope.
- The app must run **fully offline**: a snapshot of the API data and assets is
  committed (`data/printful`, `public/printful/assets`, `public/fonts`). Do not
  reintroduce runtime dependencies on external hosts.
- Commit at every milestone with a descriptive message (the owner asked for a
  granular history). Attribution line used so far:
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## 2. Stack & commands

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, `cacheComponents` on) |
| UI | React 19, Tailwind 4, lucide-react icons |
| Canvas | Fabric.js 7 (`import { Canvas, FabricImage, IText, Rect, Pattern, … } from "fabric"`) |
| State | Zustand 5 (`src/store/designer.ts`) |
| Node | 24 |

```bash
npm run dev              # http://localhost:3000
npm run build && npm start
npm run lint             # eslint (react-hooks rules are strict: no setState in effects, no refs in render)
npx tsc --noEmit         # type-check
npm run printful:snapshot   # refresh data/printful + public/printful/assets (needs PRINTFUL_API_KEY)
npm run fonts:fetch         # refresh public/fonts + src/app/fonts.css
```

Env (`.env.local`, git-ignored, optional):
`PRINTFUL_API_KEY` (only for snapshot refresh / live API / photo mockups),
`PUBLIC_BASE_URL` (public origin so the Mockup Generator can fetch print files).

Next 16 gotchas already handled: `export const revalidate` is rejected under
`cacheComponents` → data loaders use `"use cache"` + `cacheLife("hours")`;
client-only values (`new Date()`) must not run during prerender → use
`useSyncExternalStore` with an empty server snapshot (see `ProductPage.tsx`).

## 3. Repository map

```
src/app/
  page.tsx                      catalog grid (server component, loadAllProducts)
  custom/[slug]/page.tsx        product page (server) → <ProductPage>
  design/[slug]/page.tsx        designer (server) → <DesignerLoader> (client, ssr:false)
  api/printful/products/[id]    GET normalized ProductData (debug / future client use)
  api/printful/mockups          POST → Printful Mockup Generator (create task + poll)
  api/prints, api/prints/[id]   POST host a print file temporarily / GET serve it
  layout.tsx, globals.css, fonts.css

src/lib/
  catalog.ts        ProductDef/PlacementDef/VariantDef, PRODUCTS (static base), PX_PER_INCH,
                    placementDims(), placementTemplate(), variantFor(), priceFor()
  engine.ts         Fabric wrapper — ALL canvas mutations live here (see §5)
  pattern.ts        tile-mode source builder (grid/half-drop/half-brick/mirror/row/column)
  templates.ts      fallback panel outline paths (used only when no Printful template)
  mockup.ts         fallback geometry mockup compositor (no template)
  flatMockup.ts     template-based preview (print file + template PNG) — the offline mockup
  cliparts.ts, quickDesigns.ts, palette.ts, fonts.ts, quality.ts   content libraries / rules
  products.server.ts   loadProduct()/loadAllProducts(): snapshot → API → static fallback
  printful/
    types.ts        ProductData / PfVariant / TemplateInfo (normalized shape)
    server.ts       server-only client: readSnapshot(), fetchBundle(), normalize(), generateMockups()
    merge.ts        mergeProduct(base, data): overlays live data onto the static ProductDef
    printStore.ts   temp print-file store + publicBaseUrl() (honours x-forwarded-*)

src/store/designer.ts   Zustand UI state (see §6)

src/components/designer/
  DesignerShell.tsx   layout: TopBar / Rail / SidePanel / main (tabs + toolbar + viewport | MockupView) / BottomBar / modals
  DesignerLoader.tsx  next/dynamic ssr:false wrapper (Fabric needs window)
  CanvasViewport.tsx  ResizeObserver box; renders ONE <DesignCanvas> per placement, all mounted
  DesignCanvas.tsx    Fabric canvas lifecycle, template overlay, blank photo, drop zone, keyboard
  Chrome.tsx          TopBar, Rail, PanelToggle, BottomBar, PlacementTabs
  ContextTools.tsx    ContextToolbar + TransformTool / PositionTool / PatternTool / TextTool
  MockupView.tsx      live Printful mockups (if reachable) else template previews
  FlatMockupCanvas.tsx, MockupCanvas.tsx   preview renderers
  Modals.tsx          IntroModal, StitchModal (gate before Mockups), CartModal (print files + payload)
  hooks.ts            useActiveCanvas, useLayers, useSelectedObject, useUndoRedo, usePlacementPreviews
  useFileImport.ts    uploads (drop / picker) → layers
  panels/             ProductPanel, LayersPanel, UploadsPanel, TextPanel, ClipartPanel,
                      QuickDesignsPanel, PremiumPanel, FillPanel

src/components/product/  ProductPage.tsx (+SiteHeader), ProductCardImage.tsx

scripts/printful-snapshot.mjs, scripts/fetch-fonts.mjs
data/printful/<id>/{product,printfiles,templates,styles}.json   offline catalog snapshot
public/printful/assets/<sha1>.{png,jpg}                           templates + photos (70 files)
public/fonts/*.woff2                                               designer fonts
```

## 4. Data flow

```
PRODUCTS (static base: slug, breadcrumb, rating, fallback dims)
        │
        ▼  loadProduct(slug)  ["use cache", hours]
readSnapshot(id) ──found──► normalize() ──► mergeProduct(base, data) ──► ProductDef (live:true)
        │ none
        ▼
hasPrintfulKey()? ──yes──► fetchBundle(id) (5 endpoints, disk cache .cache/printful 24h) ──► same
        │ no
        ▼
   static ProductDef (live:false → generated geometry + MockupCanvas fallback)
```

`ProductDef.variants[]` is the important output: per variant (size/colour) →
`placements[pid] = { widthIn, heightIn, printfileId, dpi, template, blankImage }`.
`placementDims()` / `placementTemplate()` read it for the selected size, so the
pillow's size chips change the print area automatically.

Placements exposed = Printful's `available_placements` minus `label_*` and
`details` (fulfilment-only). Labels are stripped of the " print" suffix.

## 5. Canvas engine (`src/lib/engine.ts`)

**Coordinate system.** Logical canvas px = inches × `PX_PER_INCH` (40). Export
multiplier = `EXPORT_DPI / PX_PER_INCH` = 3.75 → e.g. rash guard 28×36 in →
1120×1440 logical → 4200×5400 px print file, which equals Printful's
`printfile` size. `toDataURL({ multiplier: EXPORT_MULTIPLIER / canvas.getZoom() })`
because Fabric's export scales the *CSS* size, not the logical size.

**One Fabric canvas per placement**, registered in a module-level `Map`
(`registerCanvas/getCanvas`). They are created once and stay mounted (hidden
with CSS) when switching placements *and* when viewing mockups — unmounting
would dispose the design. Never conditionally unmount `CanvasViewport`.

**Layer metadata** is stored directly on Fabric objects via module augmentation
(`layerId`, `layerType: image|svg|text|pattern`, `layerName`, `thumb`, `srcUrl`,
`naturalW/H`, `tileSrc/Mode/In/Gap/Offset`, `quickDesignId`, …). Everything in
`CUSTOM_PROPS` is included in `toObject()` so snapshots round-trip. Only
objects with a `layerId` are "layers" (`listLayers`, top first).

**Layer kinds**
- image: `FabricImage` from data URL; DPI = naturalW / widthIn → quality
  Good ≥150, Ok ≥100, else Poor (`quality.ts`). Shown in LayersPanel.
- svg: `loadSVGFromString` → group; vector → "Good / Vector".
- text: `IText` (double-click edits on canvas; TextPanel textarea edits live).
- pattern: full-canvas `Rect` with a `Pattern` fill built by `pattern.ts`
  (tile rasterised at 512 px, scaled with `patternTransform`); locked,
  no controls, always sent to back (`keepPatternsAtBottom`). Quick designs are
  pattern layers + a background colour; `quickDesignId === "__bg__"` marks a
  Fill-panel background pattern (hidden from the layer list, shown as the
  "Background fill" row).

**Selection styling**: cyan circle corners, dashed border, red ⓧ delete
control (`styleObject`). Apply it to every object you add or restore.

**History**: per placement, JSON snapshots (`snapshot()`/`restore()`) pushed
from `object:added|removed|modified|text:changed` (debounced 120 ms in
`DesignCanvas`). Programmatic changes that don't go through those events must
call `notify(c)` (fires `object:modified`). `restore()` sets `__restoring` so
events are ignored while reloading.

**Exports never clear the selection** — `discardActiveObject()` fires
`selection:cleared` → store bump → re-render → export again → infinite loop
(this bug happened; see commit `ab9e16a`). `toDataURL` doesn't draw controls
anyway.

## 6. UI state (`src/store/designer.ts`)

Zustand store, initialised by `DesignerShell` via `init(product)`:
`product, size, color, stitch, activePlacement, tool (rail), contextTool
(transform|position|pattern|text|null), view (design|mockups), selectedId,
tick, bg[pid], applyBgAll, history[pid], uploads, modals, panelOpen`.

- `tick` is bumped on every canvas change; hooks (`useLayers`,
  `useSelectedObject`, `usePlacementPreviews`) memoise on it to re-read Fabric
  state. Those memos intentionally list `tick` even though eslint flags it.
- `setTool()` clears `contextTool` (rail click always shows the rail panel);
  selecting a pattern layer forces `contextTool = "pattern"`.
- `SidePanel` shows the context tool editor when something is selected and a
  context tool is active, otherwise the rail panel.
- Derived flags: `canUndo/canRedo`, "designed" (`hasDesign` on any canvas →
  enables Add to cart + Design/Mockups toggle).

## 7. Designer behaviour (what to preserve)

Observed on the reference designer and reproduced:
1. Intro dialog ("Ready to design your first AOP product?") → Got it.
2. Rail: Product · Layers · Uploads · Text · Clipart · Quick Designs · Premium · Fill.
3. Empty placement shows the blank on-model/product photo + "Upload or drop
   your design here" circle; once a layer exists the template view shows
   (outline, lighter bleed outside the panel, Safe Print Area, Collar label).
4. Quick design = tiled pattern + background on **every** placement; Layers
   shows "Quick design" group → nested "Clipart" tile → "Background fill" row.
5. Context toolbar on selection: Transform (rotate, W/H linked, flip) ·
   Position (6 aligns) · Pattern (none/grid/half-drop/half-brick/mirror/row/
   column + tile size/spacing/offset) · Text (font/size/colour/align/spacing/
   outline). Tabs are sticky (clicking the active tab keeps it).
6. Design/Mockups toggle appears once there is a design; the first switch to
   Mockups requires choosing a stitch colour (modal).
7. Bottom bar: price for the selected variant · Add to cart (disabled until a
   design exists) → summary with per-placement print files and an order-shaped
   payload (`catalog_product_id`, `variant_id`, options, files[]).
8. Keyboard: Ctrl+Z/Y, Delete, Ctrl+D, arrows (Shift = 10 px).

## 8. Template overlay math (`DesignCanvas.tsx`)

A Printful template is a 3000×3000 transparent PNG whose print area is the
rect `print_area_{left,top,width,height}` (template px). With `W,H` the
logical canvas size:

```
s      = W / printAreaWidth                 // logical px per template px
frame  = { w: templateWidth·s, h: templateHeight·s }
offset = { x: printAreaLeft·s, y: printAreaTop·s }
zoom   = fit(frame) into the viewport (fitCanvas with `frame`)
```

The wrapper is `frame×zoom`; the Fabric canvas sits at `offset×zoom` with CSS
size `W×zoom, H×zoom`; the template `<img>` covers the wrapper
(`pointer-events:none`). Without a template the generated outline from
`templates.ts` is drawn as an inline SVG instead.

## 9. Mockups (four tiers, in display order)

0. **Product-photo previews** (`src/lib/photoPreview.ts`, `photoPreviewConfig.ts`,
   `PhotoPreviewCanvas.tsx`) — the default "preview on the real product",
   fully offline, no capture step. Each placement's print file is projected
   through a hand-authored bilinear quad (`quad` = TL,TR,BR,BL photo px;
   `uv` = the panel's sub-rect of the print file) onto the snapshot photo,
   clipped to a polygon `mask` ∩ light/unsaturated pixels (`surface`), then
   multiplied by the photo so folds/seams/shadows remain. Tune coordinates
   with the lab page `/dev/preview/<slug>` (labelled 50 px grid + a numbered
   test print per placement). Photos are 700×1000 (jpg) or 600×600 (png).
1. **Captured displacement mockups** (`src/lib/photoMockup.ts`, `PhotoMockups.tsx`) —
   the default on Vercel, zero API at runtime. Assets per product live in
   `public/mockups/<id>/`: `manifest.json` (views, placement index order,
   `markerStep`), `<view>.jpg` (white-print render = shading) and
   `<view>.png` (calibration render). `decodeDisplacement()` divides the
   calibration pixels by the white pixels to undo shading and reads
   `u = R`, `v = G`, `placement = round(B / markerStep)`; pixels that stay
   white (bare garment/background) decode to "none". `renderPhotoMockup()`
   then samples each design through the map and multiplies by the shading.
   Capture pipeline: `npm run mockup:calibration` (writes
   `public/calibration/*.png` with each placement's print-file aspect) →
   deploy so `/calibration` is public → `npm run mockup:capture -- --base
   <public origin>` (two generator tasks per product: white + calibration)
   → commit `public/mockups` → redeploy. Re-capture whenever a product's
   templates change.
2. **Live Printful Mockup Generator** (opt-in `NEXT_PUBLIC_PRINTFUL_LIVE_MOCKUPS=1`
   + key + `PUBLIC_BASE_URL`): `MockupView` POSTs print files to `/api/prints`
   then `/api/printful/mockups` (create task + poll). Note: `/api/prints`
   keeps files in memory + `/tmp`, which is per-instance on serverless; fine
   for a single server, flaky across lambdas (use a blob store if needed).
3. **Template previews** (`flatMockup.ts`): print file drawn into the print
   area + template PNG on top. Always available; used in the cart modal.
   **Geometry fallback** (`mockup.ts`): only when a product has no template.

The offline catalog snapshot is bundled via static imports
(`src/lib/printful/snapshot.generated.ts`, regenerate with
`npm run snapshot:index`) — never read `data/printful` with `fs` at runtime,
serverless bundles won't include it.

## 10. Offline snapshot

`scripts/printful-snapshot.mjs` fetches `/products/{id}`,
`/mockup-generator/printfiles/{id}`, `/mockup-generator/templates/{id}`,
`/v2/catalog-products/{id}/mockup-styles`, downloads every referenced image
(product/variant photos, template image + background) to
`public/printful/assets/<sha1(url)>.<ext>` and writes the raw JSON with the
URLs rewritten to `/printful/assets/...`. `server.ts#readSnapshot()` reads
those files and feeds the same `normalize()` used for live data, so both
paths produce identical `ProductData`. Re-run the script to refresh prices or
templates; commit the result.

## 11. Verification routine

1. `npx tsc --noEmit && npm run lint && npm run build` — all must be clean.
2. Run the app and, in a browser, walk: product page → Start designing →
   Got it → Quick Designs tile → Layers shows group+clipart+background →
   Clipart → handles + Transform tool → Text typing live → Mockups (stitch
   modal) → back to Design (design intact) → Add to cart (print sizes match
   `printfiles.json`).
3. Check the network panel: with the snapshot in place there must be **no**
   requests to external hosts.
4. Console must be free of "Maximum update depth" / Fabric errors.

Automated tests do not exist yet — adding Playwright coverage of the walk
above is the highest-value next step.

## 12. Known gaps / ideas

- Photo mockups must be captured once per product (see §9) — until then the
  Mockups tab shows template previews. 8-bit u/v gives ~1/256 sampling
  precision; use a 16-bit two-pass calibration if previews look blocky.
- Premium (stock image) tab is a placeholder.
- Pattern layers are rasterised tiles; vector-exact pattern export would need
  SVG tiling at export time.
- "Pricing & file guidelines", "Size guide", reviews are static links.
- No persistence of designs (localStorage/DB) and no real cart/checkout — the
  cart modal's payload is the handoff point for an order API.
- Dev-only: the designer store is exposed as `window.__designer`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
