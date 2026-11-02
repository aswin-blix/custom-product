export type PanelShape = "body" | "sleeve" | "square" | "backpack" | "side";

export interface PlacementDef {
  id: string;
  label: string;
  widthIn: number;
  heightIn: number;
  shape: PanelShape;
  /** for body panels: which side (controls neck depth + "Collar" label) */
  side?: "front" | "back";
}

export interface ProductDef {
  slug: string;
  name: string;
  category: string;
  breadcrumb: string[];
  technique: string;
  price: number;
  rating: number;
  reviews: number;
  description: string;
  sizes: string[];
  /** when true, the chosen size ("14×14") drives placement dimensions (pillow) */
  sizeDrivesDims?: boolean;
  stitchColors?: ("White" | "Black")[];
  stitchLabel?: string;
  colors?: { name: string; hex: string }[];
  mockup: "garment" | "pillow" | "backpack";
  placements: PlacementDef[];
}

/** logical canvas pixels per inch (export multiplies up to 150 DPI) */
export const PX_PER_INCH = 40;
export const EXPORT_DPI = 150;
export const EXPORT_MULTIPLIER = EXPORT_DPI / PX_PER_INCH;

const garmentPlacements = (
  bodyW: number,
  bodyH: number,
  sleeveW: number,
  sleeveH: number,
): PlacementDef[] => [
  { id: "front", label: "Front", widthIn: bodyW, heightIn: bodyH, shape: "body", side: "front" },
  { id: "back", label: "Back", widthIn: bodyW, heightIn: bodyH, shape: "body", side: "back" },
  { id: "left_sleeve", label: "Left sleeve", widthIn: sleeveW, heightIn: sleeveH, shape: "sleeve" },
  { id: "right_sleeve", label: "Right sleeve", widthIn: sleeveW, heightIn: sleeveH, shape: "sleeve" },
];

export const PRODUCTS: ProductDef[] = [
  {
    slug: "all-over-print-mens-rash-guard",
    name: "All-Over Print Men's Rash Guard",
    category: "All-over shirts",
    breadcrumb: ["Products", "Men's clothing", "All-over shirts"],
    technique: "All-over synthetic",
    price: 37.5,
    rating: 4.5,
    reviews: 166,
    description:
      "Slim-fitted and tailor-made to protect from the sun, wind, and other elements while doing sports.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    stitchColors: ["White", "Black"],
    stitchLabel: "Stitch color",
    colors: [{ name: "White", hex: "#ffffff" }],
    mockup: "garment",
    placements: garmentPlacements(24, 32, 12, 26),
  },
  {
    slug: "all-over-print-womens-long-sleeve-pajama-top",
    name: "All-Over Print Women's Long Sleeve Pajama Top",
    category: "Shirts",
    breadcrumb: ["Products", "Women's clothing", "Shirts"],
    technique: "All-over synthetic",
    price: 34.95,
    rating: 4.6,
    reviews: 92,
    description:
      "A soft, breathable long sleeve top for lounging and sleeping. Printed edge to edge with your design.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    stitchColors: ["White", "Black"],
    stitchLabel: "Stitch color",
    mockup: "garment",
    placements: garmentPlacements(24, 30, 11, 25),
  },
  {
    slug: "basic-pillow",
    name: "All-Over Print Basic Pillow",
    category: "Pillows & pillow cases",
    breadcrumb: ["Products", "Home & living", "Home decor", "Pillows & pillow cases"],
    technique: "All-over synthetic",
    price: 13.5,
    rating: 4.5,
    reviews: 380,
    description:
      "A soft, machine-washable pillow with a removable cover. Print on both sides to match any room.",
    sizes: ['14"×14"', '16"×16"', '18"×18"', '20"×12"', '22"×22"'],
    sizeDrivesDims: true,
    stitchColors: ["White", "Black"],
    stitchLabel: "Zipper & Stitch color",
    mockup: "pillow",
    placements: [
      { id: "front", label: "Front", widthIn: 14, heightIn: 14, shape: "square" },
      { id: "back", label: "Back", widthIn: 14, heightIn: 14, shape: "square" },
    ],
  },
  {
    slug: "all-over-print-oversized-cotton-sweatshirt",
    name: "All-Over Print Oversized Cotton Sweatshirt",
    category: "Sweatshirts",
    breadcrumb: ["Products", "Men's clothing", "Sweatshirts"],
    technique: "All-over synthetic",
    price: 49.95,
    rating: 4.7,
    reviews: 58,
    description:
      "A roomy, heavyweight sweatshirt with dropped shoulders. Your design wraps the entire garment.",
    sizes: ["S", "M", "L", "XL", "2XL"],
    stitchColors: ["White", "Black"],
    stitchLabel: "Stitch color",
    mockup: "garment",
    placements: garmentPlacements(30, 32, 14, 26),
  },
  {
    slug: "all-over-print-boxy-football-jersey",
    name: "All-Over Print Boxy Football Jersey",
    category: "T-shirts",
    breadcrumb: ["Products", "Men's clothing", "T-shirts"],
    technique: "All-over synthetic",
    price: 36.95,
    rating: 4.4,
    reviews: 41,
    description:
      "A boxy, breathable mesh jersey with a classic V-neck. Built for game day and everyday.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    stitchColors: ["White", "Black"],
    stitchLabel: "Stitch color",
    mockup: "garment",
    placements: garmentPlacements(28, 32, 13, 12),
  },
  {
    slug: "all-over-print-minimalist-backpack",
    name: "All-Over Print Minimalist Backpack",
    category: "Backpacks",
    breadcrumb: ["Products", "Bags", "Backpacks"],
    technique: "All-over synthetic",
    price: 44.95,
    rating: 4.6,
    reviews: 120,
    description:
      "A clean, water-resistant backpack with a padded laptop sleeve and an all-over print on every panel.",
    sizes: ["One size"],
    stitchColors: ["White", "Black"],
    stitchLabel: "Stitch color",
    mockup: "backpack",
    placements: [
      { id: "front", label: "Front", widthIn: 14, heightIn: 18, shape: "backpack" },
      { id: "back", label: "Back", widthIn: 14, heightIn: 18, shape: "backpack" },
      { id: "left_side", label: "Left side", widthIn: 5, heightIn: 18, shape: "side" },
      { id: "right_side", label: "Right side", widthIn: 5, heightIn: 18, shape: "side" },
    ],
  },
];

export function getProduct(slug: string): ProductDef | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

/** Placement dimensions in inches, accounting for size-driven products (pillow). */
export function placementDims(
  product: ProductDef,
  placement: PlacementDef,
  size: string,
): { widthIn: number; heightIn: number } {
  if (product.sizeDrivesDims) {
    const m = size.match(/(\d+)"?×(\d+)"?/);
    if (m) return { widthIn: Number(m[1]), heightIn: Number(m[2]) };
  }
  return { widthIn: placement.widthIn, heightIn: placement.heightIn };
}

export function formatPrice(n: number) {
  return `$${n.toFixed(2)}`;
}
