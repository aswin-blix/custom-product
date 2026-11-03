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
  /** per pixel: placement index (0 = none / bare product), u, v in 0..255 */
  placement: Uint8Array;
  u: Uint8Array;
  v: Uint8Array;
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
  const u = new Uint8Array(n);
  const v = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const wr = white[o], wg = white[o + 1], wb = white[o + 2];
    if (wb < 24 || wr < 24 || wg < 24) continue; // too dark to decode (deep shadow / black trims)
    const b = (uv[o + 2] / wb) * 255;
    const idx = Math.round(b / markerStep);
    // bare product (white stays white → b≈255) or out of range → leave 0
    if (idx < 1 || idx > placements || b > markerStep * placements + markerStep / 2) continue;
    placement[i] = idx;
    u[i] = Math.max(0, Math.min(255, Math.round((uv[o] / wr) * 255)));
    v[i] = Math.max(0, Math.min(255, Math.round((uv[o + 1] / wg) * 255)));
  }
  return { width, height, placement, u, v };
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
    if (!d) {
      o[p] = shade[p];
      o[p + 1] = shade[p + 1];
      o[p + 2] = shade[p + 2];
      o[p + 3] = 255;
      continue;
    }
    const sx = Math.min(d.width - 1, (u[i] * d.width) >> 8);
    const sy = Math.min(d.height - 1, (v[i] * d.height) >> 8);
    const q = (sy * d.width + sx) * 4;
    const a = d.data[q + 3] / 255;
    // design over white, then multiplied by the garment shading
    const r = d.data[q] * a + 255 * (1 - a);
    const g = d.data[q + 1] * a + 255 * (1 - a);
    const b = d.data[q + 2] * a + 255 * (1 - a);
    o[p] = (r * shade[p]) / 255;
    o[p + 1] = (g * shade[p + 1]) / 255;
    o[p + 2] = (b * shade[p + 2]) / 255;
    o[p + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}
