"use client";
import { placementDims, PX_PER_INCH, type ProductDef } from "./catalog";
import { panelPath } from "./templates";
import { loadImage } from "./pattern";

export interface PrintInput {
  dataUrl: string | null;
}

export interface MockupOptions {
  product: ProductDef;
  size: string;
  view: "front" | "back";
  stitch: "White" | "Black" | null;
  prints: Record<string, PrintInput>;
  background?: string;
}

interface Panel {
  pid: string;
  W: number;
  H: number;
  d: string;
  matrix: DOMMatrix;
}

function panelFor(product: ProductDef, pid: string, size: string) {
  const p = product.placements.find((x) => x.id === pid);
  if (!p) return null;
  const { widthIn, heightIn } = placementDims(product, p, size);
  const W = widthIn * PX_PER_INCH;
  const H = heightIn * PX_PER_INCH;
  return { p, W, H, d: panelPath(p.shape, W, H, p.side) };
}

/** Layout panels for the chosen view into a 1000×1200 scene. */
function layout(product: ProductDef, size: string, view: "front" | "back"): Panel[] {
  const panels: Panel[] = [];
  const body = panelFor(product, view, size);
  if (!body) return panels;

  if (product.mockup === "garment") {
    const bodyW = 520;
    const s = bodyW / body.W;
    const bx = 500 - bodyW / 2;
    const by = 190;
    const bodyM = new DOMMatrix().translate(bx, by).scale(s);
    const sleeveL = panelFor(product, view === "front" ? "left_sleeve" : "right_sleeve", size);
    const sleeveR = panelFor(product, view === "front" ? "right_sleeve" : "left_sleeve", size);
    const shoulderInset = body.W * 0.14;
    const sy = body.H * 0.035;
    const attach = (sl: NonNullable<typeof sleeveL>, side: -1 | 1) => {
      const tipX = side === -1 ? shoulderInset : body.W - shoulderInset;
      const tip = bodyM.transformPoint(new DOMPoint(tipX, sy));
      const capY = Math.min(sl.H * 0.18, sl.W * 0.5);
      const ss = s * 0.98;
      const m = new DOMMatrix()
        .translate(tip.x + side * 6, tip.y + 4)
        .rotate(side === -1 ? 22 : -22)
        .scale(ss)
        .translate(-sl.W / 2, -capY * 0.55);
      panels.push({ pid: sl.p.id, W: sl.W, H: sl.H, d: sl.d, matrix: m });
    };
    if (sleeveL) attach(sleeveL, -1);
    if (sleeveR) attach(sleeveR, 1);
    panels.push({ pid: body.p.id, W: body.W, H: body.H, d: body.d, matrix: bodyM });
  } else if (product.mockup === "pillow") {
    const w = 760;
    const s = w / body.W;
    const h = body.H * s;
    const m = new DOMMatrix().translate(500 - w / 2, 600 - h / 2).scale(s);
    panels.push({ pid: body.p.id, W: body.W, H: body.H, d: body.d, matrix: m });
  } else {
    const w = 480;
    const s = w / body.W;
    const h = body.H * s;
    const x = 500 - w / 2;
    const y = 600 - h / 2;
    const left = panelFor(product, view === "front" ? "left_side" : "right_side", size);
    const right = panelFor(product, view === "front" ? "right_side" : "left_side", size);
    if (left) panels.push({ pid: left.p.id, W: left.W, H: left.H, d: left.d, matrix: new DOMMatrix().translate(x - 26, y + 60).scale((34 / left.W) * 1, s * 0.92) });
    if (right) panels.push({ pid: right.p.id, W: right.W, H: right.H, d: right.d, matrix: new DOMMatrix().translate(x + w - 8, y + 60).scale(34 / right.W, s * 0.92) });
    panels.push({ pid: body.p.id, W: body.W, H: body.H, d: body.d, matrix: new DOMMatrix().translate(x, y).scale(s) });
  }
  return panels;
}

export async function renderMockup(canvas: HTMLCanvasElement, opts: MockupOptions) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const SW = 1000;
  const SH = 1200;
  canvas.width = SW;
  canvas.height = SH;
  ctx.fillStyle = opts.background ?? "#f3f4f6";
  ctx.fillRect(0, 0, SW, SH);

  const panels = layout(opts.product, opts.size, opts.view);
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    panels.map(async (p) => {
      const src = opts.prints[p.pid]?.dataUrl;
      if (src) images.set(p.pid, await loadImage(src));
    }),
  );

  // drop shadow under the whole product
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  for (const p of panels) {
    const path = new Path2D();
    path.addPath(new Path2D(p.d), p.matrix);
    ctx.fillStyle = "#ffffff";
    ctx.fill(path);
  }
  ctx.restore();

  // backpack extras (straps / handle) drawn behind the panels
  if (opts.product.mockup === "backpack") {
    ctx.save();
    ctx.fillStyle = "#2b2b2b";
    const body = panels[panels.length - 1];
    const tl = body.matrix.transformPoint(new DOMPoint(0, 0));
    const br = body.matrix.transformPoint(new DOMPoint(body.W, body.H));
    const w = br.x - tl.x;
    if (opts.view === "front") {
      ctx.beginPath();
      ctx.roundRect(tl.x + w / 2 - 50, tl.y - 36, 100, 60, 30);
      ctx.fill();
    } else {
      [0.22, 0.78].forEach((f) => {
        ctx.beginPath();
        ctx.roundRect(tl.x + w * f - 26, tl.y + 40, 52, (br.y - tl.y) * 0.85, 26);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  const stitch = opts.stitch === "Black" ? "#1a1a1a" : "#ffffff";

  for (const p of panels) {
    const path = new Path2D();
    path.addPath(new Path2D(p.d), p.matrix);
    ctx.save();
    ctx.clip(path);
    const img = images.get(p.pid);
    const tl = p.matrix.transformPoint(new DOMPoint(0, 0));
    const sx = Math.hypot(p.matrix.a, p.matrix.b);
    const sy = Math.hypot(p.matrix.c, p.matrix.d);
    if (img) {
      ctx.save();
      ctx.setTransform(p.matrix);
      ctx.drawImage(img, 0, 0, p.W, p.H);
      ctx.restore();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fill(path);
    }
    // fabric shading (multiply) + highlight (screen)
    ctx.save();
    ctx.setTransform(p.matrix);
    const g = ctx.createLinearGradient(0, 0, p.W, 0);
    g.addColorStop(0, "rgba(0,0,0,0.26)");
    g.addColorStop(0.18, "rgba(0,0,0,0.04)");
    g.addColorStop(0.5, "rgba(0,0,0,0)");
    g.addColorStop(0.82, "rgba(0,0,0,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, p.W, p.H);
    const v = ctx.createLinearGradient(0, 0, 0, p.H);
    v.addColorStop(0, "rgba(0,0,0,0.06)");
    v.addColorStop(0.5, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.16)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, p.W, p.H);
    ctx.globalCompositeOperation = "screen";
    const hl = ctx.createRadialGradient(p.W * 0.35, p.H * 0.25, 0, p.W * 0.35, p.H * 0.25, p.W * 0.8);
    hl.addColorStop(0, "rgba(255,255,255,0.18)");
    hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl;
    ctx.fillRect(0, 0, p.W, p.H);
    ctx.restore();
    ctx.restore();
    void tl;
    void sx;
    void sy;

    // seam / stitch line
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke(path);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = stitch;
    ctx.setLineDash([5, 4]);
    ctx.stroke(path);
    ctx.restore();
  }
}
