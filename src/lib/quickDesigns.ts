import type { TileMode } from "./pattern";

export interface QuickDesign {
  id: string;
  name: string;
  /** tile artwork (transparent background) */
  tileSvg: string;
  tileName: string;
  /** background color applied under the pattern */
  bg: string;
  bgName: string;
  /** tile width in inches on the product */
  tileIn: number;
  mode: TileMode;
  category: string;
}

const tile = (inner: string, size = 100) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 2}" height="${size * 2}">${inner}</svg>`;

export const QUICK_DESIGNS: QuickDesign[] = [
  {
    id: "dots",
    name: "Pattern 32",
    tileName: "Wide dots filled",
    tileSvg: tile(
      `<circle cx="20" cy="20" r="9" fill="#5b5b5b"/><circle cx="70" cy="30" r="5" fill="#5b5b5b"/><circle cx="45" cy="60" r="7" fill="#5b5b5b"/><circle cx="85" cy="75" r="9" fill="#5b5b5b"/><circle cx="15" cy="80" r="4" fill="#5b5b5b"/><circle cx="60" cy="90" r="5" fill="#5b5b5b"/>`,
    ),
    bg: "#f1f1f1",
    bgName: "Whisper",
    tileIn: 1.1,
    mode: "grid",
    category: "Patterns",
  },
  {
    id: "leaves",
    name: "Pattern 58",
    tileName: "Leaves 1",
    tileSvg: tile(
      `<path d="M50 96 C18 72 10 36 50 4 C90 36 82 72 50 96 Z" fill="none" stroke="#9fe3dd" stroke-width="3"/><path d="M50 10 V94 M50 34 q-18 14 -18 36 M50 34 q18 14 18 36" fill="none" stroke="#9fe3dd" stroke-width="3"/>`,
    ),
    bg: "#00505a",
    bgName: "Sherpa Blue",
    tileIn: 5,
    mode: "half-drop",
    category: "Patterns",
  },
  {
    id: "sprigs",
    name: "Pattern 61",
    tileName: "Sprigs",
    tileSvg: tile(
      `<g stroke="#f2b8b8" stroke-width="4" stroke-linecap="round" fill="none"><path d="M50 90 V20"/><path d="M50 70 l-16 -12 M50 70 l16 -12 M50 50 l-16 -12 M50 50 l16 -12 M50 32 l-10 -8 M50 32 l10 -8"/></g>`,
    ),
    bg: "#9b1b30",
    bgName: "Burgundy",
    tileIn: 3,
    mode: "half-brick",
    category: "Patterns",
  },
  {
    id: "bolts",
    name: "Pattern 12",
    tileName: "Lightning Bolt",
    tileSvg: tile(`<path d="M58 6 L24 54 H46 L40 94 L76 42 H54 Z" fill="#111"/>`),
    bg: "#f7b58c",
    bgName: "Apricot",
    tileIn: 2,
    mode: "grid",
    category: "Patterns",
  },
  {
    id: "zigzag",
    name: "Pattern 77",
    tileName: "Zigzag",
    tileSvg: tile(
      `<path d="M0 30 l12 -10 12 10 12 -10 12 10 12 -10 12 10 12 -10 12 10 M0 70 l12 -10 12 10 12 -10 12 10 12 -10 12 10 12 -10 12 10" fill="none" stroke="#5fd3c7" stroke-width="5" stroke-linejoin="round"/>`,
    ),
    bg: "#2aa7a0",
    bgName: "Persian Green",
    tileIn: 3,
    mode: "grid",
    category: "Patterns",
  },
  {
    id: "clouds",
    name: "Pattern 90",
    tileName: "Clouds",
    tileSvg: tile(
      `<path d="M20 60 a12 12 0 0 1 10 -20 a16 16 0 0 1 30 -4 a12 12 0 0 1 12 24 z" fill="#cfe3ff"/><path d="M60 90 a9 9 0 0 1 8 -14 a12 12 0 0 1 22 -3 a9 9 0 0 1 8 17 z" fill="#cfe3ff"/>`,
    ),
    bg: "#e2f0dc",
    bgName: "Peppermint",
    tileIn: 3.5,
    mode: "half-drop",
    category: "Patterns",
  },
  {
    id: "hex",
    name: "Geometric 4",
    tileName: "Hex grid",
    tileSvg: tile(
      `<path d="M50 4 L92 28 V76 L50 100 L8 76 V28 Z" fill="none" stroke="#d8b25c" stroke-width="4"/><path d="M50 30 L72 42 V66 L50 78 L28 66 V42 Z" fill="none" stroke="#d8b25c" stroke-width="3"/>`,
    ),
    bg: "#3b3a44",
    bgName: "Gunmetal",
    tileIn: 2.5,
    mode: "half-drop",
    category: "Geometric",
  },
  {
    id: "lines",
    name: "Geometric 9",
    tileName: "Line blocks",
    tileSvg: tile(
      `<g stroke="#f5f0e6" stroke-width="4"><path d="M10 10 h30 M10 20 h30 M10 30 h30 M10 40 h30"/><path d="M60 60 v30 M70 60 v30 M80 60 v30 M90 60 v30"/></g>`,
    ),
    bg: "#1f2d3a",
    bgName: "Midnight",
    tileIn: 2.5,
    mode: "grid",
    category: "Geometric",
  },
  {
    id: "triangles",
    name: "Geometric 15",
    tileName: "Triangles",
    tileSvg: tile(`<path d="M10 20 L40 50 L10 80 Z M60 20 L90 50 L60 80 Z" fill="#6a2c70"/>`),
    bg: "#d9a7e0",
    bgName: "Wisteria",
    tileIn: 2,
    mode: "half-brick",
    category: "Geometric",
  },
  {
    id: "stars",
    name: "Pattern 21",
    tileName: "Stars",
    tileSvg: tile(
      `<path d="M50 10 L58 34 L84 34 L63 50 L71 74 L50 60 L29 74 L37 50 L16 34 L42 34 Z" fill="#ffd166"/>`,
    ),
    bg: "#1b1f3b",
    bgName: "Navy",
    tileIn: 1.8,
    mode: "half-drop",
    category: "Patterns",
  },
  {
    id: "checker",
    name: "Geometric 2",
    tileName: "Checker",
    tileSvg: tile(`<rect x="0" y="0" width="50" height="50" fill="#111"/><rect x="50" y="50" width="50" height="50" fill="#111"/>`),
    bg: "#ffffff",
    bgName: "White",
    tileIn: 2,
    mode: "grid",
    category: "Geometric",
  },
  {
    id: "stripes",
    name: "Geometric 7",
    tileName: "Diagonal stripes",
    tileSvg: tile(`<path d="M-10 60 L60 -10 M-10 110 L110 -10 M40 110 L110 40" stroke="#ff6b6b" stroke-width="14"/>`),
    bg: "#fff3e0",
    bgName: "Linen",
    tileIn: 2.5,
    mode: "grid",
    category: "Geometric",
  },
];

export const QUICK_DESIGN_CATEGORIES = Array.from(new Set(QUICK_DESIGNS.map((q) => q.category)));

export function quickDesignById(id: string) {
  return QUICK_DESIGNS.find((q) => q.id === id);
}
