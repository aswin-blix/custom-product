#!/usr/bin/env node
/**
 * Snapshot the Printful catalog data + assets the designer needs so the app
 * runs fully offline (no API key, no CDN).
 *
 *   npm run printful:snapshot            # all six products
 *   npm run printful:snapshot -- 301 83  # specific catalog ids
 *
 * Reads PRINTFUL_API_KEY from .env.local (or the environment). Writes:
 *   data/printful/<id>/{product,printfiles,templates,styles}.json  (URLs rewritten to local paths)
 *   public/printful/assets/<sha1>.<ext>                             (template PNGs, product photos)
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data", "printful");
const ASSET_DIR = path.join(ROOT, "public", "printful", "assets");
const ASSET_URL = "/printful/assets";
const DEFAULT_IDS = [301, 827, 83, 1590, 1367, 389];

async function readKey() {
  if (process.env.PRINTFUL_API_KEY) return process.env.PRINTFUL_API_KEY;
  try {
    const env = await fs.readFile(path.join(ROOT, ".env.local"), "utf8");
    return env.match(/^PRINTFUL_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const key = await readKey();
if (!key || key.startsWith("paste-your")) {
  console.error("PRINTFUL_API_KEY is missing. Put it in .env.local first.");
  process.exit(1);
}
const H = { Authorization: `Bearer ${key}` };

async function api(p) {
  const r = await fetch(`https://api.printful.com${p}`, { headers: H });
  const j = await r.json();
  if (!r.ok) throw new Error(`${p} → ${r.status} ${j?.error?.message ?? ""}`);
  return j;
}

const downloaded = new Map(); // remote url → local path
async function download(url) {
  if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) return url;
  if (downloaded.has(url)) return downloaded.get(url);
  const r = await fetch(url);
  if (!r.ok) {
    console.warn(`  ! ${r.status} ${url}`);
    return url;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  const type = r.headers.get("content-type") ?? "";
  const ext = type.includes("png") ? "png" : type.includes("jpeg") || type.includes("jpg") ? "jpg" : type.includes("webp") ? "webp" : "bin";
  const name = `${crypto.createHash("sha1").update(url.split("?")[0]).digest("hex").slice(0, 16)}.${ext}`;
  await fs.writeFile(path.join(ASSET_DIR, name), buf);
  const local = `${ASSET_URL}/${name}`;
  downloaded.set(url, local);
  return local;
}

async function snapshot(id) {
  console.log(`\n# product ${id}`);
  const [product, printfiles, templates, styles] = await Promise.all([
    api(`/products/${id}`),
    api(`/mockup-generator/printfiles/${id}`),
    api(`/mockup-generator/templates/${id}`),
    api(`/v2/catalog-products/${id}/mockup-styles`).catch(() => ({ data: [] })),
  ]);
  console.log(`  ${product.result.product.title}: ${product.result.variants.length} variants, ${templates.result.templates.length} templates`);

  // product + variant photos
  product.result.product.image = await download(product.result.product.image);
  for (const v of product.result.variants) v.image = await download(v.image);
  // design templates (and optional backgrounds)
  for (const t of templates.result.templates) {
    t.image_url = await download(t.image_url);
    if (t.background_url) t.background_url = await download(t.background_url);
  }

  const dir = path.join(DATA_DIR, String(id));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "product.json"), JSON.stringify(product, null, 1));
  await fs.writeFile(path.join(dir, "printfiles.json"), JSON.stringify(printfiles, null, 1));
  await fs.writeFile(path.join(dir, "templates.json"), JSON.stringify(templates, null, 1));
  await fs.writeFile(path.join(dir, "styles.json"), JSON.stringify(styles, null, 1));
  console.log(`  saved → data/printful/${id}/`);
}

await fs.mkdir(ASSET_DIR, { recursive: true });
const ids = process.argv.slice(2).map(Number).filter(Boolean);
for (const id of ids.length ? ids : DEFAULT_IDS) await snapshot(id);
console.log(`\nDone. ${downloaded.size} assets in public/printful/assets/`);
