export type Quality = "vector" | "good" | "ok" | "poor";

export function qualityFromDpi(dpi: number): Quality {
  if (dpi >= 150) return "good";
  if (dpi >= 100) return "ok";
  return "poor";
}

export function qualityLabel(q: Quality) {
  switch (q) {
    case "vector":
      return { text: "Good / Vector", color: "text-green-700" };
    case "good":
      return { text: "Good", color: "text-green-700" };
    case "ok":
      return { text: "Ok", color: "text-amber-600" };
    case "poor":
      return { text: "Poor", color: "text-red-600" };
  }
}
