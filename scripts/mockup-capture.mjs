#!/usr/bin/env node
/**
 * One-time capture of Printful photo mockups as reusable local assets.
 *
 * For every product and a set of mockup styles it asks the Mockup Generator
 * for two renders: a plain white print (= photo with garment shading) and the
 * calibration print (= which print pixel lands where). The browser decodes the
 * pair at runtime into a displacement map, so previews need no API afterwards.
 *
 *   npm run mockup:capture -- --base https://your-app.vercel.app [--ids 301,83] [--max-styles 4]
 *
 * --base must be a PUBLIC origin serving public/calibration (the deployed app).
 * Needs PRINTFUL_API_KEY in .env.local. Writes public/mockups/<id>/… + manifest.json.
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]] : [])).filter((x) => x.length));
const BASE = args.base?.replace(/\/$/, "");
if (!BASE || /localhost|127\.0\.0\.1/.test(BASE)) {
  console.error("--base must be a public origin (e.g. https://your-app.vercel.app)");
  process.exit(1);
}
const MAX_STYLES = Number(args["max-styles"] ?? 4);
const ONLY = args.ids ? args.ids.split(",").map(Number) : null;

async function readKey() {
  if (process.env.PRINTFUL_API_KEY) return process.env.PRINTFUL_API_KEY;
  const env = await fs.readFile(path.join(ROOT, ".env.local"), "utf8").catch(() => "");
  return env.match(/^PRINTFUL_API_KEY=(.+)$/m)?.[1]?.trim();
}
const key = await readKey();
if (!key) {
  console.error("PRINTFUL_API_KEY missing");
  process.exit(1);
}
const H = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const api = async (p, init) => {
  const r = await fetch(`https://api.printful.com${p}`, { ...init, headers: H });
  const j = await r.json();
  if (!r.ok) throw new Error(`${p} → ${r.status} ${j?.error?.message ?? JSON.stringify(j).slice(0, 200)}`);
  return j;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runTask(productId, variantId, files, styleIds, format) {
  const body = { variant_ids: [variantId], format, mockup_style_ids: styleIds, files };
  const created = await api(`/mockup-generator/create-task/${productId}`, { method: "POST", body: JSON.stringify(body) });
  const taskKey = created.result.task_key;
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const t = await api(`/mockup-generator/task?task_key=${taskKey}`);
    if (t.result.status === "completed") return t.result.mockups;
    if (t.result.status === "failed") throw new Error(`task failed: ${t.result.error}`);
  }
  throw new Error("task timed out");
}

async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  await fs.writeFile(file, Buffer.from(await r.arrayBuffer()));
}

/** pick a spread of views: on-model / default / flat … front, back, left, right */
function pickStyles(styles) {
  const seen = new Set();
  const all = styles.flatMap((s) => s.mockup_styles).filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  const score = (m) => {
    const cat = m.category_name.toLowerCase();
    const view = m.view_name.toLowerCase();
    let s = 0;
    if (/on model|men|women|default/.test(cat)) s += 10;
    if (/flat/.test(cat)) s += 5;
    if (/lifestyle|collage|ghost|halloween/.test(cat)) s -= 5;
    if (view === "front") s += 4;
    else if (view === "back") s += 3;
    else if (/left|right/.test(view)) s += 1;
    else s -= 2;
    return s;
  };
  return all.sort((a, b) => score(b) - score(a)).slice(0, MAX_STYLES);
}

const calibration = JSON.parse(await fs.readFile(path.join(ROOT, "public", "calibration", "manifest.json"), "utf8"));
const ids = Object.keys(calibration).map(Number).filter((id) => !ONLY || ONLY.includes(id));

for (const id of ids) {
  const dir = path.join(ROOT, "data", "printful", String(id));
  const product = JSON.parse(await fs.readFile(path.join(dir, "product.json"), "utf8")).result;
  const styles = JSON.parse(await fs.readFile(path.join(dir, "styles.json"), "utf8")).data ?? [];
  const printfiles = JSON.parse(await fs.readFile(path.join(dir, "printfiles.json"), "utf8")).result;
  const variant = product.variants.find((v) => /white/i.test(v.color ?? "")) ?? product.variants[0];
  const vp = printfiles.variant_printfiles.find((x) => x.variant_id === variant.id)?.placements ?? {};
  const fileDims = new Map(printfiles.printfiles.map((f) => [f.printfile_id, f]));
  const chosen = pickStyles(styles);
  if (!chosen.length) {
    console.warn(`# ${id}: no mockup styles, skipping`);
    continue;
  }
  console.log(`\n# ${product.product.title} (${id}) variant ${variant.id} styles: ${chosen.map((m) => `${m.id}:${m.category_name}/${m.view_name}`).join(", ")}`);

  const cal = calibration[id].placements;
  const mk = (src) =>
    cal.map((c) => {
      const f = fileDims.get(vp[c.placement]);
      return { placement: c.placement, image_url: src(c), position: { area_width: f.width, area_height: f.height, width: f.width, height: f.height, top: 0, left: 0 } };
    });

  const outDir = path.join(ROOT, "public", "mockups", String(id));
  await fs.mkdir(outDir, { recursive: true });
  const styleIds = chosen.map((m) => m.id);
  console.log("  white render…");
  const white = await runTask(id, variant.id, mk(() => `${BASE}/calibration/white.png`), styleIds, "jpg");
  console.log("  calibration render…");
  const uv = await runTask(id, variant.id, mk((c) => `${BASE}/calibration/${c.file}`), styleIds, "png");

  // The generator returns one mockup per style (in `extra` when several). Flatten.
  const flat = (m) => m.flatMap((x) => [{ title: x.placement, url: x.mockup_url, styleId: x.mockup_style_id ?? null }, ...(x.extra ?? []).map((e) => ({ title: e.title, url: e.url, styleId: e.mockup_style_id ?? null }))]);
  const whites = flat(white);
  const uvs = flat(uv);
  const views = [];
  for (let i = 0; i < Math.min(whites.length, uvs.length); i++) {
    const name = (whites[i].title || `view${i}`).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const photo = `${name}-${i}.jpg`;
    const map = `${name}-${i}.png`;
    await download(whites[i].url, path.join(outDir, photo));
    await download(uvs[i].url, path.join(outDir, map));
    views.push({ id: `${name}-${i}`, label: whites[i].title || `View ${i + 1}`, photo: `/mockups/${id}/${photo}`, uv: `/mockups/${id}/${map}` });
    console.log(`  saved ${name}-${i}`);
  }
  const manifest = { productId: id, variantId: variant.id, placements: cal.map((c) => ({ placement: c.placement, index: c.index })), markerStep: 24, views };
  await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1));
  console.log(`  manifest → public/mockups/${id}/manifest.json (${views.length} views)`);
  await sleep(4000); // be polite to the rate limiter
}
console.log("\nDone. Commit public/mockups and redeploy.");
