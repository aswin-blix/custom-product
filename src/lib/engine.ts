"use client";
/**
 * Thin, typed wrapper around Fabric.js that implements the designer's
 * canvas logic: layers, pattern tiling, background fills, transform helpers,
 * snapshots for undo/redo and print-file export.
 */
import {
  Canvas,
  Control,
  FabricImage,
  FabricObject,
  IText,
  Pattern,
  Rect,
  loadSVGFromString,
  util,
  type TPointerEvent,
  type Transform,
} from "fabric";
import { EXPORT_MULTIPLIER, PX_PER_INCH } from "./catalog";
import { buildTileSource, loadImage, repeatFor, TILE_RASTER, type TileMode } from "./pattern";
import { qualityFromDpi, type Quality } from "./quality";
import { svgToDataUrl } from "./cliparts";
import { ensureFont } from "./fonts";

export type LayerType = "image" | "svg" | "text" | "pattern";

declare module "fabric" {
  interface FabricObject {
    layerId?: string;
    layerType?: LayerType;
    layerName?: string;
    layerLocked?: boolean;
    thumb?: string;
    srcUrl?: string;
    naturalW?: number;
    naturalH?: number;
    isVector?: boolean;
    tileSrc?: string;
    tileName?: string;
    tileMode?: TileMode;
    tileIn?: number;
    tileGap?: number;
    tileOffsetX?: number;
    tileOffsetY?: number;
    quickDesignId?: string;
    quickDesignName?: string;
  }
}

export const CUSTOM_PROPS = [
  "layerId",
  "layerType",
  "layerName",
  "layerLocked",
  "thumb",
  "srcUrl",
  "naturalW",
  "naturalH",
  "isVector",
  "tileSrc",
  "tileName",
  "tileMode",
  "tileIn",
  "tileGap",
  "tileOffsetX",
  "tileOffsetY",
  "quickDesignId",
  "quickDesignName",
  "hasControls",
  "lockMovementX",
  "lockMovementY",
  "lockScalingX",
  "lockScalingY",
  "lockRotation",
  "selectable",
  "evented",
  "hoverCursor",
];

let idSeq = 0;
export const nextId = () => `L${Date.now().toString(36)}${(idSeq++).toString(36)}`;

/* ------------------------------------------------------------------ */
/* registry                                                            */
/* ------------------------------------------------------------------ */

const registry = new Map<string, Canvas>();
export const registerCanvas = (pid: string, c: Canvas) => registry.set(pid, c);
export const unregisterCanvas = (pid: string) => registry.delete(pid);
export const getCanvas = (pid: string) => registry.get(pid);
export const allCanvases = () => Array.from(registry.entries());

/* ------------------------------------------------------------------ */
/* controls / selection styling                                        */
/* ------------------------------------------------------------------ */

function renderDelete(ctx: CanvasRenderingContext2D, left: number, top: number) {
  ctx.save();
  ctx.translate(left, top);
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#e5322d";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -4);
  ctx.lineTo(4, 4);
  ctx.moveTo(4, -4);
  ctx.lineTo(-4, 4);
  ctx.stroke();
  ctx.restore();
}

const deleteControl = new Control({
  x: 0.5,
  y: -0.5,
  offsetX: 14,
  offsetY: -14,
  sizeX: 22,
  sizeY: 22,
  cursorStyle: "pointer",
  mouseUpHandler: (_e: TPointerEvent, transform: Transform) => {
    const target = transform.target;
    const canvas = target.canvas;
    if (!canvas) return false;
    canvas.remove(target);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    return true;
  },
  render: renderDelete,
});

export function styleObject(obj: FabricObject) {
  obj.set({
    cornerStyle: "circle",
    cornerColor: "#22d3ee",
    cornerStrokeColor: "#ffffff",
    cornerSize: 11,
    transparentCorners: false,
    borderColor: "#94a3b8",
    borderDashArray: [4, 4],
    borderScaleFactor: 1.5,
    padding: 4,
  });
  obj.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
  obj.controls = { ...obj.controls, deleteControl };
}

/* ------------------------------------------------------------------ */
/* canvas                                                              */
/* ------------------------------------------------------------------ */

export function createCanvas(el: HTMLCanvasElement) {
  const c = new Canvas(el, {
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: "#ffffff",
    controlsAboveOverlay: true,
    selectionColor: "rgba(34,211,238,0.12)",
    selectionBorderColor: "#22d3ee",
    selectionLineWidth: 1,
  });
  return c;
}

export function fitCanvas(c: Canvas, W: number, H: number, boxW: number, boxH: number, pad = 24) {
  const z = Math.min((boxW - pad * 2) / W, (boxH - pad * 2) / H, 1.2);
  c.setDimensions({ width: Math.round(W * z), height: Math.round(H * z) });
  c.setZoom(z);
  c.requestRenderAll();
  return z;
}

/** user-facing layers in z-order, top first (patterns always sink to the bottom) */
export function listLayers(c: Canvas): FabricObject[] {
  return c
    .getObjects()
    .filter((o) => !!o.layerId)
    .slice()
    .reverse();
}

export function findLayer(c: Canvas, id: string) {
  return c.getObjects().find((o) => o.layerId === id);
}

function placeNew(c: Canvas, obj: FabricObject, fraction = 0.55) {
  const W = c.width / c.getZoom();
  const H = c.height / c.getZoom();
  const target = Math.min(W, H) * fraction;
  const w = obj.width * obj.scaleX;
  const h = obj.height * obj.scaleY;
  const s = Math.min(target / w, target / h);
  obj.scale(obj.scaleX * s);
  obj.set({ left: W / 2, top: H / 2, originX: "center", originY: "center" });
  obj.setCoords();
}

function commitAdd(c: Canvas, obj: FabricObject) {
  styleObject(obj);
  c.add(obj);
  keepPatternsAtBottom(c);
  c.setActiveObject(obj);
  c.requestRenderAll();
  return obj;
}

/** Notify listeners (history / UI) of a change that isn't tied to one object. */
export function notify(c: Canvas) {
  c.fire("object:modified", { target: undefined as unknown as FabricObject });
}

export function keepPatternsAtBottom(c: Canvas) {
  c.getObjects()
    .filter((o) => o.layerType === "pattern")
    .forEach((o) => c.sendObjectToBack(o));
}

/* ------------------------------------------------------------------ */
/* layer creation                                                      */
/* ------------------------------------------------------------------ */

export async function addImageLayer(c: Canvas, src: string, name: string) {
  const img = await FabricImage.fromURL(src, { crossOrigin: "anonymous" });
  const el = img.getElement() as HTMLImageElement;
  Object.assign(img, {
    layerId: nextId(),
    layerType: "image" as LayerType,
    layerName: name,
    srcUrl: src,
    thumb: src,
    naturalW: el.naturalWidth || img.width,
    naturalH: el.naturalHeight || img.height,
    isVector: false,
  });
  placeNew(c, img);
  return commitAdd(c, img);
}

export async function addSvgLayer(c: Canvas, svg: string, name: string) {
  const { objects, options } = await loadSVGFromString(svg);
  const group = util.groupSVGElements(objects.filter((o): o is FabricObject => !!o), options);
  const dataUrl = svgToDataUrl(svg);
  Object.assign(group, {
    layerId: nextId(),
    layerType: "svg" as LayerType,
    layerName: name,
    srcUrl: dataUrl,
    thumb: dataUrl,
    isVector: true,
  });
  placeNew(c, group, 0.35);
  return commitAdd(c, group);
}

export interface TextSpec {
  text: string;
  fontFamily: string;
  sizeIn: number;
  fontWeight?: string;
  fill?: string;
  offsetIn?: number;
}

export async function addTextLayer(c: Canvas, spec: TextSpec) {
  await ensureFont(spec.fontFamily, spec.fontWeight ?? "400");
  const W = c.width / c.getZoom();
  const H = c.height / c.getZoom();
  const t = new IText(spec.text, {
    fontFamily: spec.fontFamily,
    fontSize: spec.sizeIn * PX_PER_INCH,
    fontWeight: spec.fontWeight ?? "normal",
    fill: spec.fill ?? "#111111",
    textAlign: "center",
    originX: "center",
    originY: "center",
    left: W / 2,
    top: H / 2 + (spec.offsetIn ?? 0) * PX_PER_INCH,
  });
  Object.assign(t, {
    layerId: nextId(),
    layerType: "text" as LayerType,
    layerName: spec.text,
    isVector: true,
  });
  t.setCoords();
  return commitAdd(c, t);
}

export interface PatternSpec {
  tileSrc: string;
  tileName: string;
  mode: TileMode;
  tileIn: number;
  gap?: number;
  offsetX?: number;
  offsetY?: number;
  quickDesignId?: string;
  quickDesignName?: string;
}

async function makePatternFill(spec: PatternSpec) {
  const img = await loadImage(spec.tileSrc);
  const source = buildTileSource(img, spec.mode, spec.gap ?? 0);
  const scale = (spec.tileIn * PX_PER_INCH) / TILE_RASTER;
  return new Pattern({
    source,
    repeat: repeatFor(spec.mode),
    patternTransform: [scale, 0, 0, scale, (spec.offsetX ?? 0) * PX_PER_INCH, (spec.offsetY ?? 0) * PX_PER_INCH],
  });
}

export async function addPatternLayer(c: Canvas, spec: PatternSpec) {
  const W = c.width / c.getZoom();
  const H = c.height / c.getZoom();
  const rect = new Rect({
    left: 0,
    top: 0,
    width: W,
    height: H,
    originX: "left",
    originY: "top",
    hasControls: false,
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
    lockScalingX: true,
    lockScalingY: true,
    hoverCursor: "default",
    fill: await makePatternFill(spec),
  });
  Object.assign(rect, {
    layerId: nextId(),
    layerType: "pattern" as LayerType,
    layerName: spec.quickDesignName ?? `${spec.tileName} pattern`,
    thumb: spec.tileSrc,
    tileSrc: spec.tileSrc,
    tileName: spec.tileName,
    tileMode: spec.mode,
    tileIn: spec.tileIn,
    tileGap: spec.gap ?? 0,
    tileOffsetX: spec.offsetX ?? 0,
    tileOffsetY: spec.offsetY ?? 0,
    quickDesignId: spec.quickDesignId,
    quickDesignName: spec.quickDesignName,
    isVector: true,
  });
  styleObject(rect);
  rect.set({ borderColor: "transparent" });
  c.add(rect);
  keepPatternsAtBottom(c);
  c.setActiveObject(rect);
  c.requestRenderAll();
  return rect;
}

export async function updatePatternLayer(c: Canvas, obj: FabricObject, patch: Partial<PatternSpec>) {
  const spec: PatternSpec = {
    tileSrc: patch.tileSrc ?? obj.tileSrc!,
    tileName: patch.tileName ?? obj.tileName!,
    mode: patch.mode ?? obj.tileMode ?? "grid",
    tileIn: patch.tileIn ?? obj.tileIn ?? 2,
    gap: patch.gap ?? obj.tileGap ?? 0,
    offsetX: patch.offsetX ?? obj.tileOffsetX ?? 0,
    offsetY: patch.offsetY ?? obj.tileOffsetY ?? 0,
  };
  obj.set("fill", await makePatternFill(spec));
  Object.assign(obj, {
    tileSrc: spec.tileSrc,
    tileName: spec.tileName,
    tileMode: spec.mode,
    tileIn: spec.tileIn,
    tileGap: spec.gap,
    tileOffsetX: spec.offsetX,
    tileOffsetY: spec.offsetY,
  });
  obj.dirty = true;
  c.requestRenderAll();
  c.fire("object:modified", { target: obj });
}

/** Turn a single image/svg layer into a repeating pattern layer (Printful "Pattern" tool). */
export async function convertToPattern(c: Canvas, obj: FabricObject, mode: TileMode) {
  if (!obj.srcUrl) return null;
  const info = layerInfo(obj);
  const rect = await addPatternLayer(c, {
    tileSrc: obj.srcUrl,
    tileName: obj.layerName ?? "Pattern",
    mode,
    tileIn: Math.max(0.5, info.widthIn),
  });
  c.remove(obj);
  keepPatternsAtBottom(c);
  c.setActiveObject(rect);
  c.requestRenderAll();
  return rect;
}

/** Collapse a pattern layer back into a single tile layer. */
export async function convertToSingle(c: Canvas, obj: FabricObject) {
  if (!obj.tileSrc) return null;
  const isSvg = obj.tileSrc.startsWith("data:image/svg");
  let layer: FabricObject;
  if (isSvg) {
    const svg = decodeURIComponent(obj.tileSrc.split(",")[1]);
    layer = await addSvgLayer(c, svg, obj.tileName ?? "Clipart");
  } else {
    layer = await addImageLayer(c, obj.tileSrc, obj.tileName ?? "Image");
  }
  const target = (obj.tileIn ?? 2) * PX_PER_INCH;
  layer.scaleToWidth(target);
  layer.setCoords();
  c.remove(obj);
  c.setActiveObject(layer);
  c.requestRenderAll();
  return layer;
}

/* ------------------------------------------------------------------ */
/* background                                                          */
/* ------------------------------------------------------------------ */

export function setBackgroundColor(c: Canvas, color: string | null) {
  c.backgroundColor = color ?? "#ffffff";
  c.requestRenderAll();
  notify(c);
}

export async function setBackgroundPattern(c: Canvas, spec: PatternSpec, under: string) {
  const fill = await makePatternFill(spec);
  // Fabric background only accepts one filler; compose color+tile via a
  // dedicated pattern layer instead so the color remains editable.
  c.backgroundColor = under;
  const existing = c.getObjects().find((o) => o.layerType === "pattern" && o.quickDesignId === "__bg__");
  if (existing) c.remove(existing);
  const W = c.width / c.getZoom();
  const H = c.height / c.getZoom();
  const rect = new Rect({
    left: 0,
    top: 0,
    width: W,
    height: H,
    fill,
    selectable: false,
    evented: false,
    hasControls: false,
  });
  Object.assign(rect, {
    layerId: nextId(),
    layerType: "pattern" as LayerType,
    layerName: spec.tileName,
    thumb: spec.tileSrc,
    tileSrc: spec.tileSrc,
    tileName: spec.tileName,
    tileMode: spec.mode,
    tileIn: spec.tileIn,
    quickDesignId: "__bg__",
    quickDesignName: "Background pattern",
    isVector: true,
  });
  c.add(rect);
  keepPatternsAtBottom(c);
  c.requestRenderAll();
  notify(c);
}

export function clearBackground(c: Canvas) {
  c.getObjects()
    .filter((o) => o.quickDesignId === "__bg__")
    .forEach((o) => c.remove(o));
  c.backgroundColor = "#ffffff";
  c.requestRenderAll();
  notify(c);
}

/* ------------------------------------------------------------------ */
/* layer ops                                                           */
/* ------------------------------------------------------------------ */

export interface LayerInfo {
  widthIn: number;
  heightIn: number;
  dpi: number | null;
  quality: Quality;
}

export function layerInfo(obj: FabricObject): LayerInfo {
  const widthIn = (obj.width * obj.scaleX) / PX_PER_INCH;
  const heightIn = (obj.height * obj.scaleY) / PX_PER_INCH;
  if (obj.layerType === "image" && obj.naturalW) {
    const dpi = obj.naturalW / Math.max(widthIn, 0.01);
    return { widthIn, heightIn, dpi, quality: qualityFromDpi(dpi) };
  }
  return { widthIn, heightIn, dpi: null, quality: "vector" };
}

export function setLayerSize(c: Canvas, obj: FabricObject, widthIn?: number, heightIn?: number, keepRatio = true) {
  if (obj.layerType === "pattern") return;
  const ratio = (obj.width * obj.scaleX) / (obj.height * obj.scaleY);
  if (widthIn != null) {
    const w = widthIn * PX_PER_INCH;
    obj.set("scaleX", w / obj.width);
    if (keepRatio) obj.set("scaleY", w / ratio / obj.height);
  }
  if (heightIn != null) {
    const h = heightIn * PX_PER_INCH;
    obj.set("scaleY", h / obj.height);
    if (keepRatio) obj.set("scaleX", (h * ratio) / obj.width);
  }
  obj.setCoords();
  c.requestRenderAll();
  c.fire("object:modified", { target: obj });
}

export function setRotation(c: Canvas, obj: FabricObject, deg: number) {
  obj.rotate(deg);
  obj.setCoords();
  c.requestRenderAll();
  c.fire("object:modified", { target: obj });
}

export function flip(c: Canvas, obj: FabricObject, axis: "x" | "y") {
  if (axis === "x") obj.set("flipX", !obj.flipX);
  else obj.set("flipY", !obj.flipY);
  c.requestRenderAll();
  c.fire("object:modified", { target: obj });
}

export type Align = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

export function align(c: Canvas, obj: FabricObject, how: Align) {
  const W = c.width / c.getZoom();
  const H = c.height / c.getZoom();
  const r = obj.getBoundingRect();
  const z = c.getZoom();
  const bw = r.width / z;
  const bh = r.height / z;
  const bx = r.left / z;
  const by = r.top / z;
  let dx = 0;
  let dy = 0;
  switch (how) {
    case "left":
      dx = -bx;
      break;
    case "hcenter":
      dx = W / 2 - (bx + bw / 2);
      break;
    case "right":
      dx = W - (bx + bw);
      break;
    case "top":
      dy = -by;
      break;
    case "vcenter":
      dy = H / 2 - (by + bh / 2);
      break;
    case "bottom":
      dy = H - (by + bh);
      break;
  }
  obj.set({ left: obj.left + dx, top: obj.top + dy });
  obj.setCoords();
  c.requestRenderAll();
  c.fire("object:modified", { target: obj });
}

export function toggleLock(c: Canvas, obj: FabricObject) {
  const locked = !obj.layerLocked;
  obj.layerLocked = locked;
  if (obj.layerType !== "pattern") {
    obj.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      lockRotation: locked,
      hasControls: !locked,
    });
  }
  c.requestRenderAll();
  c.fire("object:modified", { target: obj });
}

export async function duplicate(c: Canvas, obj: FabricObject) {
  const clone = await obj.clone(CUSTOM_PROPS);
  clone.set({ left: obj.left + 20, top: obj.top + 20 });
  clone.layerId = nextId();
  styleObject(clone);
  c.add(clone);
  keepPatternsAtBottom(c);
  c.setActiveObject(clone);
  c.requestRenderAll();
  return clone;
}

export function removeLayer(c: Canvas, obj: FabricObject) {
  c.remove(obj);
  c.discardActiveObject();
  c.requestRenderAll();
}

export function moveLayer(c: Canvas, obj: FabricObject, dir: "up" | "down" | "top" | "bottom") {
  if (dir === "up") c.bringObjectForward(obj);
  if (dir === "down") c.sendObjectBackwards(obj);
  if (dir === "top") c.bringObjectToFront(obj);
  if (dir === "bottom") c.sendObjectToBack(obj);
  keepPatternsAtBottom(c);
  c.requestRenderAll();
  c.fire("object:modified", { target: obj });
}

export function nudge(c: Canvas, obj: FabricObject, dx: number, dy: number) {
  if (obj.lockMovementX && obj.lockMovementY) return;
  obj.set({ left: obj.left + dx, top: obj.top + dy });
  obj.setCoords();
  c.requestRenderAll();
  c.fire("object:modified", { target: obj });
}

export async function setTextProps(
  c: Canvas,
  obj: FabricObject,
  patch: Partial<{ text: string; fontFamily: string; fontSize: number; fill: string; textAlign: string; charSpacing: number; stroke: string | null; strokeWidth: number; fontWeight: string; fontStyle: string }>,
) {
  if (!(obj instanceof IText)) return;
  if (patch.fontFamily) await ensureFont(patch.fontFamily, patch.fontWeight ?? String(obj.fontWeight));
  obj.set(patch as Record<string, unknown>);
  if (patch.text != null) obj.layerName = patch.text;
  obj.setCoords();
  c.requestRenderAll();
  c.fire("object:modified", { target: obj });
}

/* ------------------------------------------------------------------ */
/* snapshots (undo / redo) + export                                    */
/* ------------------------------------------------------------------ */

export interface Snapshot {
  objects: unknown[];
  background: string;
}

export function snapshot(c: Canvas): string {
  const json = c.toObject(CUSTOM_PROPS) as { objects: unknown[]; background?: string };
  return JSON.stringify({ objects: json.objects, background: c.backgroundColor ?? "#ffffff" });
}

export async function restore(c: Canvas, data: string) {
  const snap = JSON.parse(data) as Snapshot;
  (c as unknown as { __restoring: boolean }).__restoring = true;
  try {
    c.discardActiveObject();
    c.remove(...c.getObjects());
    const objs = await util.enlivenObjects<FabricObject>(snap.objects as Record<string, unknown>[]);
    objs.forEach((o) => {
      styleObject(o);
      if (o.layerType === "pattern") o.set({ borderColor: "transparent" });
      c.add(o);
    });
    c.backgroundColor = snap.background;
    keepPatternsAtBottom(c);
    c.requestRenderAll();
  } finally {
    (c as unknown as { __restoring: boolean }).__restoring = false;
  }
}

export function isRestoring(c: Canvas) {
  return !!(c as unknown as { __restoring?: boolean }).__restoring;
}

export function hasDesign(c: Canvas) {
  return c.getObjects().some((o) => !!o.layerId) || (c.backgroundColor !== "#ffffff" && !!c.backgroundColor);
}

/** Full-resolution print file (150 DPI) regardless of the on-screen zoom. */
export function exportPrintFile(c: Canvas, format: "png" | "jpeg" = "png") {
  const active = c.getActiveObject();
  c.discardActiveObject();
  c.renderAll();
  const url = c.toDataURL({ format, multiplier: EXPORT_MULTIPLIER / c.getZoom(), enableRetinaScaling: false });
  if (active) c.setActiveObject(active);
  c.requestRenderAll();
  return url;
}

/** Lightweight preview (for mockups + thumbnails). */
export function exportPreview(c: Canvas, maxPx = 1200) {
  const W = c.width / c.getZoom();
  const H = c.height / c.getZoom();
  const mult = Math.min(maxPx / W, maxPx / H) / c.getZoom();
  const active = c.getActiveObject();
  c.discardActiveObject();
  c.renderAll();
  const url = c.toDataURL({ format: "png", multiplier: mult, enableRetinaScaling: false });
  if (active) c.setActiveObject(active);
  c.requestRenderAll();
  return url;
}
