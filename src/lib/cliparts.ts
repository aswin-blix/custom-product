export interface Clipart {
  id: string;
  name: string;
  svg: string;
  tags: string[];
}

export interface ClipartCategory {
  id: string;
  name: string;
  items: Clipart[];
}

const wrap = (inner: string, vb = "0 0 100 100") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="200" height="200">${inner}</svg>`;

export const CLIPART_CATEGORIES: ClipartCategory[] = [
  {
    id: "fun",
    name: "Melting objects & faces",
    items: [
      {
        id: "smiley",
        name: "Melting Smiley Face",
        tags: ["face", "happy", "fun"],
        svg: wrap(
          `<circle cx="50" cy="44" r="36" fill="#f6c343" stroke="#1b1b1b" stroke-width="4"/>
           <path d="M34 72 q4 20 10 2 M52 78 q3 18 8 0 M64 70 q2 14 7 2" fill="#f6c343" stroke="#1b1b1b" stroke-width="4" stroke-linecap="round"/>
           <circle cx="38" cy="38" r="4" fill="#1b1b1b"/><circle cx="62" cy="38" r="4" fill="#1b1b1b"/>
           <path d="M34 52 q16 14 32 0" fill="none" stroke="#1b1b1b" stroke-width="4" stroke-linecap="round"/>`,
        ),
      },
      {
        id: "popsicle",
        name: "Melting Popsicle",
        tags: ["ice", "summer"],
        svg: wrap(
          `<rect x="46" y="60" width="8" height="34" rx="4" fill="#d9a066" stroke="#1b1b1b" stroke-width="3"/>
           <path d="M30 14 h40 v46 q0 8 -8 8 h-24 q-8 0 -8 -8 z" fill="#e85d5d" stroke="#1b1b1b" stroke-width="4"/>
           <path d="M38 64 q2 10 6 0 M56 66 q2 12 6 0" fill="#e85d5d" stroke="#1b1b1b" stroke-width="3"/>
           <rect x="38" y="22" width="6" height="26" rx="3" fill="#fff" opacity=".6"/>`,
        ),
      },
      {
        id: "basketball",
        name: "Melting Basketball",
        tags: ["sport", "ball"],
        svg: wrap(
          `<circle cx="50" cy="46" r="36" fill="#f08a3c" stroke="#1b1b1b" stroke-width="4"/>
           <path d="M14 46 h72 M50 10 v72 M24 20 q26 26 52 0 M24 72 q26 -26 52 0" fill="none" stroke="#1b1b1b" stroke-width="3"/>
           <path d="M40 80 q2 12 6 0 M58 82 q2 12 6 0" fill="#f08a3c" stroke="#1b1b1b" stroke-width="3"/>`,
        ),
      },
      {
        id: "apple",
        name: "Melting Apple",
        tags: ["fruit", "food"],
        svg: wrap(
          `<path d="M50 24 q-24 -10 -32 18 q-6 30 20 48 q12 6 24 0 q26 -18 20 -48 q-8 -28 -32 -18z" fill="#8bc34a" stroke="#1b1b1b" stroke-width="4"/>
           <path d="M50 24 q4 -12 14 -14" fill="none" stroke="#1b1b1b" stroke-width="4" stroke-linecap="round"/>
           <path d="M36 86 q2 10 6 0" fill="#8bc34a" stroke="#1b1b1b" stroke-width="3"/>`,
        ),
      },
      {
        id: "diamond",
        name: "Melting Diamond",
        tags: ["gem", "shiny"],
        svg: wrap(
          `<path d="M26 20 h48 l16 20 -40 50 -40 -50 z" fill="#7ec8f2" stroke="#1b1b1b" stroke-width="4" stroke-linejoin="round"/>
           <path d="M10 40 h80 M26 20 l14 20 10 -20 10 20 14 -20 M40 40 l10 50 10 -50" fill="none" stroke="#1b1b1b" stroke-width="3"/>`,
        ),
      },
      {
        id: "banana",
        name: "Melting Banana",
        tags: ["fruit", "food"],
        svg: wrap(
          `<path d="M22 30 q-6 40 34 56 q24 8 30 -8 q-30 4 -50 -24 q-8 -12 -8 -26 z" fill="#f9d548" stroke="#1b1b1b" stroke-width="4" stroke-linejoin="round"/>
           <path d="M22 30 q-2 -8 4 -10 q4 -1 4 4" fill="#8b5a2b" stroke="#1b1b1b" stroke-width="3"/>`,
        ),
      },
      {
        id: "pencil",
        name: "Melting Pencil",
        tags: ["school", "draw"],
        svg: wrap(
          `<g transform="rotate(45 50 50)"><rect x="42" y="10" width="16" height="60" fill="#f6c343" stroke="#1b1b1b" stroke-width="4"/>
           <rect x="42" y="10" width="16" height="10" fill="#e85d5d" stroke="#1b1b1b" stroke-width="4"/>
           <path d="M42 70 l8 18 8 -18z" fill="#f3d9b1" stroke="#1b1b1b" stroke-width="4" stroke-linejoin="round"/>
           <path d="M47 82 l3 6 3 -6z" fill="#1b1b1b"/></g>`,
        ),
      },
      {
        id: "peace",
        name: "Melting Peace Hand",
        tags: ["hand", "peace"],
        svg: wrap(
          `<path d="M36 90 v-30 q-10 -4 -10 -16 l6 -30 q2 -6 8 -4 l2 30 l4 -34 q2 -6 8 -4 l0 38 h4 v-20 q0 -6 6 -6 q6 0 6 6 v28 q0 24 -18 28 z" fill="#f9d548" stroke="#1b1b1b" stroke-width="4" stroke-linejoin="round"/>`,
        ),
      },
    ],
  },
  {
    id: "shapes",
    name: "Shapes & symbols",
    items: [
      { id: "heart", name: "Heart", tags: ["love"], svg: wrap(`<path d="M50 88 L16 54 Q4 40 14 26 Q28 12 44 26 L50 32 L56 26 Q72 12 86 26 Q96 40 84 54 Z" fill="#e63946"/>`) },
      { id: "star", name: "Star", tags: ["shape"], svg: wrap(`<path d="M50 6 L62 36 L94 38 L68 58 L78 90 L50 72 L22 90 L32 58 L6 38 L38 36 Z" fill="#ffb703"/>`) },
      { id: "bolt", name: "Lightning Bolt", tags: ["energy"], svg: wrap(`<path d="M58 4 L22 54 H46 L38 96 L78 40 H54 Z" fill="#111"/>`) },
      { id: "leaf", name: "Leaves 1", tags: ["nature", "plant"], svg: wrap(`<path d="M50 94 C20 70 14 36 50 6 C86 36 80 70 50 94 Z M50 94 V10" fill="#2a9d8f" stroke="#e0fbfc" stroke-width="3"/><path d="M50 30 q-16 14 -16 36 M50 30 q16 14 16 36" fill="none" stroke="#e0fbfc" stroke-width="3"/>`) },
      { id: "wave", name: "Wave", tags: ["ocean", "sea"], svg: wrap(`<path d="M4 60 q12 -24 24 0 t24 0 t24 0 t24 0 v30 H4 z" fill="#219ebc"/><path d="M4 60 q12 -24 24 0 t24 0 t24 0 t24 0" fill="none" stroke="#8ecae6" stroke-width="5"/>`) },
      { id: "circle", name: "Circle", tags: ["shape"], svg: wrap(`<circle cx="50" cy="50" r="44" fill="#264653"/>`) },
      { id: "triangle", name: "Triangle", tags: ["shape"], svg: wrap(`<path d="M50 8 L94 90 H6 Z" fill="#f4a261"/>`) },
      { id: "hexagon", name: "Hexagon", tags: ["shape"], svg: wrap(`<path d="M50 4 L92 27 V73 L50 96 L8 73 V27 Z" fill="#6a4c93"/>`) },
    ],
  },
  {
    id: "flags",
    name: "Flags & badges",
    items: [
      { id: "flag-ca", name: "Maple Leaf", tags: ["canada", "flag"], svg: wrap(`<path d="M50 6 l6 14 10 -4 -4 16 14 -4 -8 14 12 6 -24 6 2 20 -8 -8 -8 8 2 -20 -24 -6 12 -6 -8 -14 14 4 -4 -16 10 4z" fill="#d62828"/>`) },
      { id: "badge", name: "Badge", tags: ["award"], svg: wrap(`<circle cx="50" cy="42" r="30" fill="#ffb703" stroke="#fb8500" stroke-width="6"/><path d="M34 66 l-8 28 24 -12 24 12 -8 -28" fill="#fb8500"/><circle cx="50" cy="42" r="14" fill="#fff"/>`) },
      { id: "sun", name: "Sun", tags: ["weather"], svg: wrap(`<circle cx="50" cy="50" r="22" fill="#ffd166"/><g stroke="#ffd166" stroke-width="6" stroke-linecap="round"><path d="M50 6v14M50 80v14M6 50h14M80 50h14M19 19l10 10M71 71l10 10M19 81l10-10M71 29l10-10"/></g>`) },
      { id: "moon", name: "Moon", tags: ["night"], svg: wrap(`<path d="M62 8 A42 42 0 1 0 92 60 A32 32 0 0 1 62 8 Z" fill="#8d99ae"/>`) },
    ],
  },
];

export const ALL_CLIPARTS = CLIPART_CATEGORIES.flatMap((c) => c.items);

export function clipartById(id: string) {
  return ALL_CLIPARTS.find((c) => c.id === id);
}

export function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
