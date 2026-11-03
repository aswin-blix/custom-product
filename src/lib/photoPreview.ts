"use client";
/**
 * Real-product preview from a plain product photo: each placement's print file
 * is projected onto a hand-authored quad (bilinear mesh, so sleeves and 3/4
 * views work), clipped to the garment (polygon ∩ light, unsaturated pixels of
 * the white product) and multiplied by the photo so folds, seams and shadows
 * stay. Works offline with the snapshot photos; no API.
 */
import { loadImage } from "./pattern";

export type Pt = [number, number];

export interface PreviewLayer {
  placement: string;
  /** TL, TR, BR, BL in photo pixels — where the print region (`uv`) lands */
  quad: [Pt, Pt, Pt, Pt];
  /** sub-rectangle of the print file (u0, v0, u1, v1 in 0..1) mapped onto `quad`; default whole file */
  uv?: [number, number, number, number];
  /** optional polygon (photo px) limiting the print to this region */
  mask?: Pt[];
  /** mesh subdivisions (default 24) */
  subdiv?: number;
}

export interface PreviewView {
  id: string;
  label: string;
  photo: string;
  layers: PreviewLayer[];
  /** pixel test for "this is the printable product surface" */
  surface?: { minLum?: number; maxSat?: number };
}

const bilerp = (q: [Pt, Pt, Pt, Pt], u: number, v: number): Pt => {
  const [tl, tr, br, bl] = q;
  const x = (1 - v) * ((1 - u) * tl[0] + u * tr[0]) + v * ((1 - u) * bl[0] + u * br[0]);
  const y = (1 - v) * ((1 - u) * tl[1] + u * tr[1]) + v * ((1 - u) * bl[1] + u * br[1]);
  return [x, y];
};

/** Draw the source triangle of `img` onto the destination triangle (affine). */
function drawTriangle(ctx: CanvasRenderingContext2D, img: CanvasImageSource, s: [Pt, Pt, Pt], d: [Pt, Pt, Pt]) {
  const [[x0, y0], [x1, y1], [x2, y2]] = d;
  const [[u0, v0], [u1, v1], [u2, v2]] = s;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();
  // solve affine M so that M·(u,v) = (x,y) for the three points
  const det = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
  if (Math.abs(det) < 1e-6) {
    ctx.restore();
    return;
  }
  const a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / det;
  const b = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / det;
  const c = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / det;
  const dd = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / det;
  const e = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / det;
  const f = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / det;
  ctx.setTransform(a, b, c, dd, e, f);
  // slight overdraw hides seams between cells
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function warpInto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, layer: PreviewLayer) {
  const n = layer.subdiv ?? 24;
  const [su0, sv0, su1, sv1] = layer.uv ?? [0, 0, 1, 1];
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  // source px for a (u,v) inside the mapped region
  const sx = (u: number) => (su0 + u * (su1 - su0)) * w;
  const sy = (v: number) => (sv0 + v * (sv1 - sv0)) * h;
  if (layer.mask) {
    ctx.save();
    const p = new Path2D();
    layer.mask.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
    ctx.clip(p);
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, v0 = j / n, v1 = (j + 1) / n;
      const s00: Pt = [sx(u0), sy(v0)], s10: Pt = [sx(u1), sy(v0)], s11: Pt = [sx(u1), sy(v1)], s01: Pt = [sx(u0), sy(v1)];
      const d00 = bilerp(layer.quad, u0, v0), d10 = bilerp(layer.quad, u1, v0), d11 = bilerp(layer.quad, u1, v1), d01 = bilerp(layer.quad, u0, v1);
      // expand each triangle by a hair to avoid hairline gaps
      drawTriangle(ctx, img, [s00, s10, s11], [d00, d10, d11]);
      drawTriangle(ctx, img, [s00, s11, s01], [d00, d11, d01]);
    }
  }
  if (layer.mask) ctx.restore();
}

export async function renderPhotoPreview(canvas: HTMLCanvasElement, view: PreviewView, prints: Record<string, string | null>) {
  const photo = await loadImage(view.photo);
  const W = photo.naturalWidth;
  const H = photo.naturalHeight;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(photo, 0, 0);
  const base = ctx.getImageData(0, 0, W, H);

  // design layer
  const dc = document.createElement("canvas");
  dc.width = W;
  dc.height = H;
  const dctx = dc.getContext("2d", { willReadFrequently: true })!;
  dctx.imageSmoothingQuality = "high";
  let any = false;
  for (const layer of view.layers) {
    const src = prints[layer.placement];
    if (!src) continue;
    const img = await loadImage(src);
    warpInto(dctx, img, layer);
    any = true;
  }
  if (!any) return;
  const design = dctx.getImageData(0, 0, W, H).data;

  const minLum = view.surface?.minLum ?? 96;
  const maxSat = view.surface?.maxSat ?? 0.22;
  const p = base.data;
  for (let i = 0; i < p.length; i += 4) {
    const da = design[i + 3];
    if (!da) continue;
    const r = p[i], g = p[i + 1], b = p[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = mx ? (mx - mn) / mx : 0;
    if (lum < minLum || sat > maxSat) continue; // skin, hair, trims, dark background
    const a = da / 255;
    // design over white, then multiplied by the photo (keeps folds & shadows)
    const dr = (design[i] * a + 255 * (1 - a)) * (r / 255);
    const dg = (design[i + 1] * a + 255 * (1 - a)) * (g / 255);
    const db = (design[i + 2] * a + 255 * (1 - a)) * (b / 255);
    p[i] = dr;
    p[i + 1] = dg;
    p[i + 2] = db;
  }
  ctx.putImageData(base, 0, 0);
}
