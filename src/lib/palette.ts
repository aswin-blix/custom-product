export interface Swatch {
  name: string;
  hex: string;
}

export const PALETTE: Swatch[] = [
  { name: "White", hex: "#ffffff" },
  { name: "Whisper", hex: "#f1f1f1" },
  { name: "Silver", hex: "#c9c9c9" },
  { name: "Gray", hex: "#8e8e8e" },
  { name: "Dim Gray", hex: "#5b5b5b" },
  { name: "Charcoal", hex: "#333333" },
  { name: "Black", hex: "#111111" },
  { name: "Rosewood", hex: "#5e2129" },
  { name: "Burgundy", hex: "#9b1b30" },
  { name: "Crimson", hex: "#d62828" },
  { name: "Coral", hex: "#ff6b6b" },
  { name: "Blush", hex: "#f9c6c9" },
  { name: "Apricot", hex: "#f7b58c" },
  { name: "Tangerine", hex: "#f08a3c" },
  { name: "Mustard", hex: "#e9b949" },
  { name: "Sunflower", hex: "#ffd166" },
  { name: "Linen", hex: "#fff3e0" },
  { name: "Olive", hex: "#6b8e23" },
  { name: "Fern", hex: "#4f9d69" },
  { name: "Forest", hex: "#2d6a4f" },
  { name: "Mint", hex: "#b7efc5" },
  { name: "Peppermint", hex: "#e2f0dc" },
  { name: "Teal", hex: "#2a9d8f" },
  { name: "Persian Green", hex: "#2aa7a0" },
  { name: "Sherpa Blue", hex: "#00505a" },
  { name: "Sky", hex: "#8ecae6" },
  { name: "Cerulean", hex: "#219ebc" },
  { name: "Royal", hex: "#1d4ed8" },
  { name: "Navy", hex: "#1b1f3b" },
  { name: "Midnight", hex: "#1f2d3a" },
  { name: "Lavender", hex: "#d9a7e0" },
  { name: "Orchid", hex: "#b185db" },
  { name: "Plum", hex: "#6a2c70" },
  { name: "Magenta", hex: "#d63384" },
  { name: "Pink", hex: "#ff85a1" },
  { name: "Gunmetal", hex: "#3b3a44" },
];

export function swatchName(hex: string) {
  return PALETTE.find((s) => s.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex.toUpperCase();
}

export function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
