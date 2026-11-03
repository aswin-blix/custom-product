#!/usr/bin/env node
/**
 * Generate calibration print files for the mockup capture:
 *   public/calibration/white.png                 plain white (captures garment shading)
 *   public/calibration/<id>-<placement>.png      R = u (0..255 left→right), G = v (top→bottom),
 *                                                B = placement marker (index × 24, 1-based)
 * Each file has the exact aspect ratio of that placement's print file so the
 * generator's "cover" fit introduces no crop.
 *
 *   npm run mockup:calibration
 */
import fs from "node:fs/promises";
import path from "node:path";
import { encodePng } from "./lib/png.mjs";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "calibration");
const DATA = path.join(ROOT, "data", "printful");
const MAX = 1200; // px on the long edge — plenty for 8-bit coordinates
export const MARKER_STEP = 24;
const HIDDEN = /^label_|^details$/;

await fs.mkdir(OUT, { recursive: true });

// white
{
  const w = 64;
  const rgb = Buffer.alloc(w * w * 3, 255);
  await fs.writeFile(path.join(OUT, "white.png"), encodePng(w, w, rgb));
}

const ids = (await fs.readdir(DATA)).filter((d) => /^\d+$/.test(d));
const manifest = {};
for (const id of ids) {
  const pfs = JSON.parse(await fs.readFile(path.join(DATA, id, "printfiles.json"), "utf8")).result;
  const placements = Object.keys(pfs.available_placements).filter((p) => !HIDDEN.test(p));
  const files = new Map(pfs.printfiles.map((f) => [f.printfile_id, f]));
  // use the first variant's printfile per placement (sizes share aspect ratios)
  const vp = pfs.variant_printfiles[0].placements;
  manifest[id] = { placements: [] };
  placements.forEach((placement, i) => {
    const file = files.get(vp[placement]);
    if (!file) return;
    const scale = MAX / Math.max(file.width, file.height);
    const w = Math.max(2, Math.round(file.width * scale));
    const h = Math.max(2, Math.round(file.height * scale));
    const rgb = Buffer.alloc(w * h * 3);
    const marker = (i + 1) * MARKER_STEP;
    for (let y = 0; y < h; y++) {
      const g = Math.round((y / (h - 1)) * 255);
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 3;
        rgb[o] = Math.round((x / (w - 1)) * 255);
        rgb[o + 1] = g;
        rgb[o + 2] = marker;
      }
    }
    const name = `${id}-${placement}.png`;
    manifest[id].placements.push({ placement, index: i + 1, file: name, printfileId: file.printfile_id, width: file.width, height: file.height });
    return fs.writeFile(path.join(OUT, name), encodePng(w, h, rgb)).then(() => console.log(`${name} ${w}x${h} marker=${marker}`));
  });
}
await fs.writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
console.log("wrote public/calibration/manifest.json");
