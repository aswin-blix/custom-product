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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (p, init) => {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`https://api.printful.com${p}`, { ...init, headers: H });
    const j = await r.json();
    if (r.status === 429 && attempt < 6) {
      const wait = Number(j?.error?.message?.match(/(\d+) seconds/)?.[1] ?? 60) + 5;
      console.log(`  rate limited — waiting ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    if (!r.ok) throw new Error(`${p} → ${r.status} ${j?.error?.message ?? JSON.stringify(j).slice(0, 200)}`);
    return j;
  }
};

async function runTask(productId, variantId, files, optionGroups, options, format) {
  // option_groups selects the mockup families (On Model, Flat, Lifestyle…) and
  // options the views inside them; the generator returns one view per placement
  // plus `extra` views per group/option.
  const body = { variant_ids: [variantId], format, files, ...(optionGroups.length ? { option_groups: optionGroups } : {}), ...(options.length ? { options } : {}) };
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

/** mockup families to request: every category the catalog lists except seasonal/collage ones */
function pickGroups(styles) {
  const cats = Array.from(new Set(styles.flatMap((s) => s.mockup_styles.map((m) => m.category_name))));
  return cats.filter((c) => !/collage|ghost|halloween|christmas|valentine/i.test(c)).slice(0, MAX_STYLES);
}

/** view names inside the chosen families (Front, Back, Left, Front Lifestyle 8, …) */
function pickOptions(styles, groups) {
  const set = new Set(styles.flatMap((s) => s.mockup_styles.filter((m) => groups.includes(m.category_name)).map((m) => m.view_name)));
  return Array.from(set);
}

const VIEW_LABEL = { front: "Front", back: "Back", sleeve_left: "Left", sleeve_right: "Right", left: "Left", right: "Right", top: "Top", bottom: "Bottom" };

const calibration = JSON.parse(await fs.readFile(path.join(ROOT, "public", "calibration", "manifest.json"), "utf8"));
const ids = Object.keys(calibration).map(Number).filter((id) => !ONLY || ONLY.includes(id));

for (const id of ids) {
  // resume: skip products that already have a manifest (delete the folder to re-capture)
  const existing = await fs.readFile(path.join(ROOT, "public", "mockups", String(id), "manifest.json"), "utf8").catch(() => null);
  if (existing && !args.force) {
    console.log(`# ${id}: already captured, skipping`);
    continue;
  }
  const dir = path.join(ROOT, "data", "printful", String(id));
  const product = JSON.parse(await fs.readFile(path.join(dir, "product.json"), "utf8")).result;
  const styles = JSON.parse(await fs.readFile(path.join(dir, "styles.json"), "utf8")).data ?? [];
  const printfiles = JSON.parse(await fs.readFile(path.join(dir, "printfiles.json"), "utf8")).result;
  // garments: the white variant; size-only products (pillow): a middle size, which
  // carries the full mockup-style set (the smallest sizes only have Default views)
  const whiteVariants = product.variants.filter((v) => /white/i.test(v.color ?? ""));
  const variant = whiteVariants[0] ?? product.variants[Math.floor(product.variants.length / 2)];
  const vp = printfiles.variant_printfiles.find((x) => x.variant_id === variant.id)?.placements ?? {};
  const fileDims = new Map(printfiles.printfiles.map((f) => [f.printfile_id, f]));
  const groups = pickGroups(styles);
  const options = pickOptions(styles, groups);
  console.log(`\n# ${product.product.title} (${id}) variant ${variant.id} groups: ${groups.join(", ") || "(default)"} | options: ${options.join(", ")}`);

  const cal = calibration[id].placements;
  const mk = (src) =>
    cal.map((c) => {
      const f = fileDims.get(vp[c.placement]);
      return { placement: c.placement, image_url: src(c), position: { area_width: f.width, area_height: f.height, width: f.width, height: f.height, top: 0, left: 0 } };
    });

  const outDir = path.join(ROOT, "public", "mockups", String(id));
  await fs.mkdir(outDir, { recursive: true });
  console.log("  white render…");
  const white = await runTask(id, variant.id, mk(() => `${BASE}/calibration/white.png`), groups, options, "jpg");
  console.log("  calibration render…");
  const uv = await runTask(id, variant.id, mk((c) => `${BASE}/calibration/${c.file}`), groups, options, "png");

  // One main view per placement (the default family) plus `extra` views per option group.
  const flat = (m) =>
    m.flatMap((x) => [
      { key: `main-${x.placement}`, label: VIEW_LABEL[x.placement] ?? x.placement, url: x.mockup_url },
      ...(x.extra ?? []).map((e) => ({ key: `${e.option_group}-${e.option}-${x.placement}`, label: `${e.option_group} · ${e.title}`, url: e.url })),
    ]);
  const whites = flat(white);
  const uvs = new Map(flat(uv).map((v) => [v.key, v]));
  const views = [];
  const seen = new Set();
  for (const w of whites) {
    const u = uvs.get(w.key);
    if (!u || seen.has(w.url)) continue;
    seen.add(w.url);
    const name = w.key.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await download(w.url, path.join(outDir, `${name}.jpg`));
    await download(u.url, path.join(outDir, `${name}.png`));
    views.push({ id: name, label: w.label, photo: `/mockups/${id}/${name}.jpg`, uv: `/mockups/${id}/${name}.png` });
    console.log(`  saved ${name} (${w.label})`);
  }
  const manifest = { productId: id, variantId: variant.id, placements: cal.map((c) => ({ placement: c.placement, index: c.index })), markerStep: 24, views };
  await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1));
  console.log(`  manifest → public/mockups/${id}/manifest.json (${views.length} views)`);
  await sleep(4000); // be polite to the rate limiter
}
console.log("\nDone. Commit public/mockups and redeploy.");
