"use client";
/**
 * Local photo mockups: a captured Printful render pair (white print → shading,
 * calibration print → coordinates) is decoded into a displacement map once;
 * the user's design is then sampled through it on every change. No API.
 */
import { loadImage } from "./pattern";

export interface MockupManifest {
  productId: number;
  variantId: number;
  placements: { placement: string; index: number }[];
  markerStep: number;
  views: { id: string; label: string; photo: string; uv: string }[];
}

export interface DisplacementMap {
  width: number;
  height: number;
  /** shading (the white render), RGBA */
  shade: Uint8ClampedArray;
  /** per pixel: placement index (0 = none / bare product), u, v in 0..1 */
  placement: Uint8Array;
  u: Float32Array;
  v: Float32Array;
}

const manifestCache = new Map<number, Promise<MockupManifest | null>>();
export function loadManifest(productId: number) {
  let p = manifestCache.get(productId);
  if (!p) {
    p = fetch(`/mockups/${productId}/manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<MockupManifest>) : null))
      .catch(() => null);
    manifestCache.set(productId, p);
  }
  return p;
}

function pixels(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height).data;
}

/**
 * Pure decode so it can be unit-tested: divides the calibration render by the
 * white render to undo shading, then reads u/v/marker.
 */
export function decodeDisplacement(white: Uint8ClampedArray, uv: Uint8ClampedArray, width: number, height: number, markerStep: number, placements: number): Omit<DisplacementMap, "shade"> {
  const n = width * height;
  const placement = new Uint8Array(n);
  const u = new Float32Array(n);
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const wr = white[o], wg = white[o + 1], wb = white[o + 2];
    const cr = uv[o], cg = uv[o + 1], cb = uv[o + 2];
    if (uv[o + 3] < 16) continue; // transparent background of the PNG render
    if (wb < 24 || wr < 24 || wg < 24) continue; // too dark to decode (deep shadow / black trims)
    // Bare product: the print did not touch this pixel, so both renders agree.
    // Everything else carries the calibration colours (the generator's own
    // highlights can brighten them, so snap to the nearest placement).
    if (Math.abs(cr - wr) + Math.abs(cg - wg) + Math.abs(cb - wb) < 36) continue;
    const b = (cb / wb) * 255;
    placement[i] = Math.max(1, Math.min(placements, Math.round(b / markerStep)));
    u[i] = Math.min(1, cr / wr);
    v[i] = Math.min(1, cg / wg);
  }
  // The true mapping is smooth, so averaging neighbours inside the same placement
  // recovers precision lost to 8-bit colour and JPEG noise.
  smooth(u, placement, width, height, 2);
  smooth(v, placement, width, height, 2);
  return { width, height, placement, u, v };
}

function smooth(src: Float32Array, placement: Uint8Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(src.length);
  for (let pass = 0; pass < 2; pass++) {
    const from = pass === 0 ? src : tmp;
    const to = pass === 0 ? tmp : src;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const p = placement[i];
        if (!p) {
          to[i] = 0;
          continue;
        }
        let sum = 0, cnt = 0;
        if (pass === 0) {
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const j = i + dx;
            if (placement[j] !== p) continue;
            sum += from[j];
            cnt++;
          }
        } else {
          for (let dy = -r; dy <= r; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= h) continue;
            const j = i + dy * w;
            if (placement[j] !== p) continue;
            sum += from[j];
            cnt++;
          }
        }
        to[i] = cnt ? sum / cnt : from[i];
      }
    }
  }
}

const mapCache = new Map<string, Promise<DisplacementMap>>();
export function loadDisplacementMap(view: MockupManifest["views"][number], manifest: MockupManifest) {
  let p = mapCache.get(view.uv);
  if (!p) {
    p = (async () => {
      const [photo, uv] = await Promise.all([loadImage(view.photo), loadImage(view.uv)]);
      const w = Math.min(photo.naturalWidth, uv.naturalWidth);
      const h = Math.min(photo.naturalHeight, uv.naturalHeight);
      const shade = pixels(photo);
      const uvPx = pixels(uv);
      const d = decodeDisplacement(shade, uvPx, w, h, manifest.markerStep, manifest.placements.length);
      return { ...d, shade };
    })();
    mapCache.set(view.uv, p);
  }
  return p;
}

/** design previews per placement index (1-based), as RGBA pixel buffers */
export interface DesignSource {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export async function designSourceFromDataUrl(dataUrl: string, maxPx = 800): Promise<DesignSource> {
  const img = await loadImage(dataUrl);
  const s = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * s));
  c.height = Math.max(1, Math.round(img.naturalHeight * s));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { width: c.width, height: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
}

/** Render a view: design pixels through the map, multiplied by the photo shading. */
export function renderPhotoMockup(canvas: HTMLCanvasElement, map: DisplacementMap, designs: Map<number, DesignSource>) {
  const { width, height, shade, placement, u, v } = map;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const out = ctx.createImageData(width, height);
  const o = out.data;
  const n = width * height;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const idx = placement[i];
    const d = idx ? designs.get(idx) : undefined;
    const transparent = shade[p + 3] < 16;
    if (!d) {
      o[p] = transparent ? 255 : shade[p];
      o[p + 1] = transparent ? 255 : shade[p + 1];
      o[p + 2] = transparent ? 255 : shade[p + 2];
      o[p + 3] = 255;
      continue;
    }
    // bilinear sample of the design at (u, v)
    const fx = Math.min(d.width - 1.001, u[i] * (d.width - 1));
    const fy = Math.min(d.height - 1.001, v[i] * (d.height - 1));
    const x0 = fx | 0, y0 = fy | 0;
    const tx = fx - x0, ty = fy - y0;
    const q00 = (y0 * d.width + x0) * 4, q10 = q00 + 4, q01 = q00 + d.width * 4, q11 = q01 + 4;
    const dd = d.data;
    let r = 0, g = 0, b = 0, a = 0;
    const wts = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty];
    const qs = [q00, q10, q01, q11];
    for (let k = 0; k < 4; k++) {
      const wgt = wts[k], q = qs[k];
      const al = dd[q + 3] / 255;
      r += dd[q] * al * wgt + 255 * (1 - al) * wgt;
      g += dd[q + 1] * al * wgt + 255 * (1 - al) * wgt;
      b += dd[q + 2] * al * wgt + 255 * (1 - al) * wgt;
      a += al * wgt;
    }
    void a;
    // design over white, then multiplied by the garment shading
    o[p] = (r * shade[p]) / 255;
    o[p + 1] = (g * shade[p + 1]) / 255;
    o[p + 2] = (b * shade[p + 2]) / 255;
    o[p + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}
