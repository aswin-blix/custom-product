import type { TemplateInfo, PfMockupStyle } from "./printful/types";

export type PanelShape = "body" | "sleeve" | "square" | "backpack" | "side";

export interface PlacementDef {
  id: string;
  label: string;
  widthIn: number;
  heightIn: number;
  /** fallback geometry used when no Printful template is available */
  shape: PanelShape;
  side?: "front" | "back";
}

export interface VariantPlacement {
  widthIn: number;
  heightIn: number;
  printfileId?: number;
  dpi?: number;
  template?: TemplateInfo | null;
  blankImage?: string | null;
}

export interface VariantDef {
  id: number;
  size: string;
  color: string | null;
  colorHex?: string | null;
  price: number;
  image?: string;
  inStock?: boolean;
  placements: Record<string, VariantPlacement>;
}

export interface ProductDef {
  slug: string;
  /** Printful catalog product id */
  printfulId: number;
  name: string;
  category: string;
  breadcrumb: string[];
  technique: string;
  price: number;
  rating: number;
  reviews: number;
  description: string;
  image?: string;
  gallery?: string[];
  sizes: string[];
  /** when true, the chosen size ("14×14") drives placement dimensions (pillow) */
  sizeDrivesDims?: boolean;
  stitchColors?: string[];
  stitchLabel?: string;
  colors?: { name: string; hex: string }[];
  mockup: "garment" | "pillow" | "backpack";
  placements: PlacementDef[];
  /** live catalog variants (present once Printful data has been merged) */
  variants?: VariantDef[];
  mockupStyles?: PfMockupStyle[];
  live?: boolean;
}

/** logical canvas pixels per inch (export multiplies up to 150 DPI) */
export const PX_PER_INCH = 40;
export const EXPORT_DPI = 150;
export const EXPORT_MULTIPLIER = EXPORT_DPI / PX_PER_INCH;

const garmentPlacements = (bodyW: number, bodyH: number, sleeveW: number, sleeveH: number): PlacementDef[] => [
  { id: "front", label: "Front", widthIn: bodyW, heightIn: bodyH, shape: "body", side: "front" },
  { id: "back", label: "Back", widthIn: bodyW, heightIn: bodyH, shape: "body", side: "back" },
  { id: "sleeve_left", label: "Left sleeve", widthIn: sleeveW, heightIn: sleeveH, shape: "sleeve" },
  { id: "sleeve_right", label: "Right sleeve", widthIn: sleeveW, heightIn: sleeveH, shape: "sleeve" },
];

export const PRODUCTS: ProductDef[] = [
  {
    slug: "all-over-print-mens-rash-guard",
    printfulId: 301,
    name: "All-Over Print Men's Rash Guard",
    category: "All-over shirts",
    breadcrumb: ["Products", "Men's clothing", "All-over shirts"],
    technique: "All-over synthetic",
    price: 37.5,
    rating: 4.5,
    reviews: 166,
    description: "Slim-fitted and tailor-made to protect from the sun, wind, and other elements while doing sports.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    stitchColors: ["White", "Black"],
    stitchLabel: "Stitch color",
    colors: [{ name: "White", hex: "#ffffff" }],
    mockup: "garment",
    placements: garmentPlacements(28, 36, 28, 36),
  },
  {
    slug: "all-over-print-womens-long-sleeve-pajama-top",
    printfulId: 827,
    name: "All-Over Print Women's Long Sleeve Pajama Top",
    category: "Shirts",
    breadcrumb: ["Products", "Women's clothing", "Shirts"],
    technique: "All-over synthetic",
    price: 29.57,
    rating: 4.6,
    reviews: 92,
    description: "A soft, breathable long sleeve top for lounging and sleeping. Printed edge to edge with your design.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    stitchLabel: "Stitch color",
    mockup: "garment",
    placements: [...garmentPlacements(30, 35, 30, 35), { id: "pocket", label: "Pocket", widthIn: 30, heightIn: 10, shape: "square" }],
  },
  {
    slug: "basic-pillow",
    printfulId: 83,
    name: "All-Over Print Basic Pillow",
    category: "Pillows & pillow cases",
    breadcrumb: ["Products", "Home & living", "Home decor", "Pillows & pillow cases"],
    technique: "All-over synthetic",
    price: 13.5,
    rating: 4.5,
    reviews: 380,
    description: "A soft, machine-washable pillow with a removable cover. Print on both sides to match any room.",
    sizes: ['14″×14″', '16″×16″', '18″×18″', '20″×12″', '22″×22″'],
    sizeDrivesDims: true,
    stitchColors: ["White", "Black"],
    stitchLabel: "Zipper & Stitch color",
    mockup: "pillow",
    placements: [
      { id: "front", label: "Front", widthIn: 15, heightIn: 15, shape: "square" },
      { id: "back", label: "Back", widthIn: 15, heightIn: 15, shape: "square" },
    ],
  },
  {
    slug: "all-over-print-oversized-cotton-sweatshirt",
    printfulId: 1590,
    name: "All-Over Print Oversized Cotton Sweatshirt",
    category: "Sweatshirts",
    breadcrumb: ["Products", "Men's clothing", "Sweatshirts"],
    technique: "All-over synthetic",
    price: 42.84,
    rating: 4.7,
    reviews: 58,
    description: "A roomy, heavyweight sweatshirt with dropped shoulders. Your design wraps the entire garment.",
    sizes: ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"],
    stitchColors: ["White", "Black"],
    stitchLabel: "Stitch color",
    mockup: "garment",
    placements: [
      { id: "front_dtfabric", label: "Front", widthIn: 44, heightIn: 54, shape: "body", side: "front" },
      { id: "back_dtfabric", label: "Back", widthIn: 44, heightIn: 54, shape: "body", side: "back" },
      { id: "sleeve_left_dtfabric", label: "Left sleeve", widthIn: 44, heightIn: 54, shape: "sleeve" },
      { id: "sleeve_right_dtfabric", label: "Right sleeve", widthIn: 44, heightIn: 54, shape: "sleeve" },
    ],
  },
  {
    slug: "all-over-print-boxy-football-jersey",
    printfulId: 1367,
    name: "All-Over Print Boxy Football Jersey",
    category: "T-shirts",
    breadcrumb: ["Products", "Men's clothing", "T-shirts"],
    technique: "All-over synthetic",
    price: 37.74,
    rating: 4.4,
    reviews: 41,
    description: "A boxy, breathable mesh jersey with a classic V-neck. Built for game day and everyday.",
    sizes: ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"],
    stitchColors: ["White", "Black"],
    stitchLabel: "Stitch color",
    mockup: "garment",
    placements: garmentPlacements(40, 40, 40, 15),
  },
  {
    slug: "all-over-print-minimalist-backpack",
    printfulId: 389,
    name: "All-Over Print Minimalist Backpack",
    category: "Backpacks",
    breadcrumb: ["Products", "Bags", "Backpacks"],
    technique: "All-over synthetic",
    price: 37.75,
    rating: 4.6,
    reviews: 120,
    description: "A clean, water-resistant backpack with a padded laptop sleeve and an all-over print on every panel.",
    sizes: ["One size"],
    stitchColors: ["Black", "Clear"],
    stitchLabel: "Stitch color",
    mockup: "backpack",
    placements: [
      { id: "front", label: "Front", widthIn: 14, heightIn: 19, shape: "backpack" },
      { id: "top", label: "Top panel", widthIn: 28, heightIn: 11, shape: "square" },
      { id: "bottom", label: "Bottom panel", widthIn: 28, heightIn: 7.5, shape: "square" },
    ],
  },
];

export function getProduct(slug: string): ProductDef | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

/** The catalog variant for a size (+ optional color). */
export function variantFor(product: ProductDef, size: string, color?: string): VariantDef | undefined {
  const vs = product.variants ?? [];
  return vs.find((v) => v.size === size && (!color || v.color === color)) ?? vs.find((v) => v.size === size) ?? vs[0];
}

export function priceFor(product: ProductDef, size: string, color?: string) {
  return variantFor(product, size, color)?.price ?? product.price;
}

/** Placement geometry in inches for the selected variant (falls back to the static definition). */
export function placementDims(product: ProductDef, placement: PlacementDef, size: string, color?: string): { widthIn: number; heightIn: number } {
  const vp = variantFor(product, size, color)?.placements[placement.id];
  if (vp) return { widthIn: vp.widthIn, heightIn: vp.heightIn };
  if (product.sizeDrivesDims) {
    const m = size.match(/(\d+)[″"]?×(\d+)[″"]?/);
    if (m) return { widthIn: Number(m[1]), heightIn: Number(m[2]) };
  }
  return { widthIn: placement.widthIn, heightIn: placement.heightIn };
}

export function placementTemplate(product: ProductDef, placement: PlacementDef, size: string, color?: string): TemplateInfo | null {
  return variantFor(product, size, color)?.placements[placement.id]?.template ?? null;
}

export function formatPrice(n: number) {
  return `$${n.toFixed(2)}`;
}
