# CLAUDE.md

Start with `AGENTS.md` — it is the full engineering reference (architecture,
invariants, verification routine, open items). `README.md` is the short
user-facing overview.

Conventions for this repo:

- Verify before committing: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Commit at every milestone with a descriptive message; the owner wants a
  granular history.
- Keep the app runnable offline (no runtime calls to external hosts); catalog
  data and assets live in `data/printful` and `public/printful/assets`.
- Catalog data comes only from Printful's official API via
  `npm run printful:snapshot` — never scrape their site or bundles.
- All Fabric mutations go through `src/lib/engine.ts`; never
  `discardActiveObject()` during exports; never unmount `CanvasViewport`.
- Test designer changes in a real browser following the walk in
  `AGENTS.md` §11.
