export type TileMode = "grid" | "half-drop" | "half-brick" | "mirror" | "row" | "column";

export const TILE_MODES: { id: TileMode | "none"; label: string }[] = [
  { id: "none", label: "None" },
  { id: "grid", label: "Grid" },
  { id: "half-drop", label: "Half drop" },
  { id: "half-brick", label: "Half brick" },
  { id: "mirror", label: "Mirror" },
  { id: "row", label: "Row" },
  { id: "column", label: "Column" },
];

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

/** Fixed raster size for the tile source so exports stay sharp when scaled. */
export const TILE_RASTER = 512;

/**
 * Build the repeating source canvas for a tile mode. The returned canvas is
 * meant to be used with repeat:"repeat" (or repeat-x / repeat-y for row/column)
 * and then scaled with patternTransform to the desired on-product size.
 */
export function buildTileSource(img: HTMLImageElement, mode: TileMode, gapRatio = 0): HTMLCanvasElement {
  const aspect = img.naturalHeight / img.naturalWidth || 1;
  const tw = TILE_RASTER;
  const th = Math.round(TILE_RASTER * aspect);
  const gap = Math.round(tw * gapRatio);
  const cw = tw + gap;
  const ch = th + gap;

  const c = document.createElement("canvas");
  let ctx: CanvasRenderingContext2D;
  const draw = (x: number, y: number, flipX = false, flipY = false) => {
    ctx.save();
    ctx.translate(x + gap / 2, y + gap / 2);
    if (flipX || flipY) {
      ctx.translate(flipX ? tw : 0, flipY ? th : 0);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    }
    ctx.drawImage(img, 0, 0, tw, th);
    ctx.restore();
  };

  switch (mode) {
    case "grid":
    case "row":
    case "column":
      c.width = cw;
      c.height = ch;
      ctx = c.getContext("2d")!;
      draw(0, 0);
      break;
    case "half-drop":
      c.width = cw * 2;
      c.height = ch;
      ctx = c.getContext("2d")!;
      draw(0, 0);
      draw(cw, ch / 2);
      draw(cw, ch / 2 - ch);
      break;
    case "half-brick":
      c.width = cw;
      c.height = ch * 2;
      ctx = c.getContext("2d")!;
      draw(0, 0);
      draw(cw / 2, ch);
      draw(cw / 2 - cw, ch);
      break;
    case "mirror":
      c.width = cw * 2;
      c.height = ch * 2;
      ctx = c.getContext("2d")!;
      draw(0, 0);
      draw(cw, 0, true, false);
      draw(0, ch, false, true);
      draw(cw, ch, true, true);
      break;
  }
  return c;
}

export function repeatFor(mode: TileMode): "repeat" | "repeat-x" | "repeat-y" {
  if (mode === "row") return "repeat-x";
  if (mode === "column") return "repeat-y";
  return "repeat";
}
