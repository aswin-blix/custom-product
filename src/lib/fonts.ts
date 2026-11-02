export interface FontCombo {
  id: string;
  name: string;
  lines: { text: string; font: string; size: number; weight?: string; transform?: "uppercase" }[];
}

export const FONT_FAMILIES = [
  "Lobster",
  "Pacifico",
  "Bebas Neue",
  "Oswald",
  "Anton",
  "Playfair Display",
  "Dancing Script",
  "Montserrat",
  "Permanent Marker",
  "Abril Fatface",
  "Arial",
  "Georgia",
  "Impact",
];

export const FONT_COMBOS: FontCombo[] = [
  { id: "script-caps", name: "Your / Text Here", lines: [{ text: "Your", font: "Lobster", size: 3 }, { text: "TEXT HERE", font: "Montserrat", size: 0.8, transform: "uppercase" }] },
  { id: "arc-caps", name: "Your Text Here", lines: [{ text: "YOUR TEXT HERE", font: "Bebas Neue", size: 1.6 }] },
  { id: "serif-bold", name: "YOUR / text here", lines: [{ text: "YOUR", font: "Playfair Display", size: 2.4, weight: "bold" }, { text: "text here", font: "Playfair Display", size: 1 }] },
  { id: "badge", name: "Your Text", lines: [{ text: "YOUR", font: "Montserrat", size: 0.8 }, { text: "TEXT", font: "Anton", size: 2.6 }, { text: "HERE", font: "Montserrat", size: 0.8 }] },
  { id: "tall", name: "YOUR TEXT here", lines: [{ text: "YOUR TEXT", font: "Oswald", size: 2.2, weight: "bold" }, { text: "here", font: "Playfair Display", size: 2.2 }] },
  { id: "handwritten", name: "Your Text Here", lines: [{ text: "YOUR", font: "Montserrat", size: 0.8 }, { text: "Text Here", font: "Dancing Script", size: 2.2 }] },
  { id: "marker", name: "Burn", lines: [{ text: "BURN", font: "Permanent Marker", size: 2.6 }] },
  { id: "fatface", name: "Oops", lines: [{ text: "better an", font: "Montserrat", size: 0.8 }, { text: "OOPS", font: "Abril Fatface", size: 3 }] },
];

export const QUOTES = ["Burn bright", "Don't live in the past", "better an OOPS than a what if", "Good vibes only", "Stay salty", "Game day"];

export function googleFontsHref() {
  const families = ["Lobster", "Pacifico", "Bebas+Neue", "Oswald:wght@400;700", "Anton", "Playfair+Display:wght@400;700", "Dancing+Script", "Montserrat:wght@400;700", "Permanent+Marker", "Abril+Fatface"];
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
}

export async function ensureFont(family: string, weight = "400") {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await document.fonts.load(`${weight} 32px "${family}"`);
  } catch {
    /* fall back to whatever the browser has */
  }
}
