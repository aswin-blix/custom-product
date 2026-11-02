import type { PlacementDef, ProductDef, VariantDef } from "@/lib/catalog";
import type { ProductData } from "./types";

/**
 * Overlay live Printful catalog data (placements, print-file sizes, templates,
 * variants, prices, photos) onto the static product definition. When `data` is
 * null the static definition is returned untouched, so the designer keeps
 * working offline with generated geometry.
 */
const SIZE_ORDER = ["2XS", "XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "XXXL", "4XL", "5XL", "One size"];

/** Apparel sizes in wearing order; dimensional sizes (14″×14″) by width, then height. */
export function bySize(a: string, b: string) {
  const ia = SIZE_ORDER.indexOf(a);
  const ib = SIZE_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  const dims = (s: string): [number, number] => {
    const m = s.match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/);
    return m ? [Number(m[1]), Number(m[2])] : [0, 0];
  };
  const [aw, ah] = dims(a);
  const [bw, bh] = dims(b);
  return aw - bw || ah - bh || a.localeCompare(b);
}

export function mergeProduct(base: ProductDef, data: ProductData | null): ProductDef {
  if (!data) return base;

  const variants: VariantDef[] = data.variants.map((v) => ({
    id: v.id,
    size: v.size,
    color: v.color,
    colorHex: v.colorHex,
    price: v.price,
    image: v.image,
    inStock: v.inStock,
    placements: Object.fromEntries(
      Object.entries(v.placements).map(([pid, d]) => [
        pid,
        { widthIn: d.width / d.dpi, heightIn: d.height / d.dpi, printfileId: d.printfileId, dpi: d.dpi, template: d.template, blankImage: d.blankImage },
      ]),
    ),
  }));

  const sizes = Array.from(new Set(variants.map((v) => v.size))).sort(bySize);
  const colors = Array.from(new Map(variants.filter((v) => v.color).map((v) => [v.color!, { name: v.color!, hex: v.colorHex ?? "#ffffff" }])).values());
  const stitch = data.options.find((o) => o.id === "stitch_color");

  const placements: PlacementDef[] = data.placements.map((p) => {
    const fallback = base.placements.find((b) => b.id === p.id || b.id.replace("_sleeve", "") === p.id.replace("sleeve_", ""));
    return {
      id: p.id,
      label: p.label,
      widthIn: p.widthIn,
      heightIn: p.heightIn,
      shape: fallback?.shape ?? (p.id.includes("sleeve") ? "sleeve" : p.id === "front" || p.id === "back" ? (base.mockup === "garment" ? "body" : "square") : "square"),
      side: p.id.startsWith("back") ? "back" : "front",
    };
  });

  return {
    ...base,
    name: data.name,
    description: data.description.split("\n")[0] || base.description,
    image: data.image,
    // catalog photo + one photo per colour (variant photos only differ by colour)
    gallery: Array.from(new Set([data.image, ...Array.from(new Map(variants.map((v) => [v.color ?? "", v.image])).values())])).filter((u): u is string => !!u),
    price: variants.find((v) => v.size === sizes[0])?.price ?? variants[0]?.price ?? base.price,
    sizes: sizes.length ? sizes : base.sizes,
    colors: colors.length ? colors : base.colors,
    stitchColors: stitch ? stitch.values.map((v) => v.label) : undefined,
    stitchLabel: stitch?.title ?? base.stitchLabel,
    placements: placements.length ? placements : base.placements,
    variants,
    mockupStyles: data.mockupStyles,
    live: true,
  };
}
