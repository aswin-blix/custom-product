"use client";
import { useEffect, useMemo, useState } from "react";
import { PHOTO_PREVIEWS } from "@/lib/photoPreviewConfig";
import PhotoPreviewCanvas from "@/components/designer/PhotoPreviewCanvas";

/** test print: coloured 10×10 grid with the placement name and u/v ticks */
function testPrint(label: string, aspect: number) {
  const w = 1000;
  const h = Math.round(1000 / aspect);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  for (let j = 0; j < 10; j++)
    for (let i = 0; i < 10; i++) {
      x.fillStyle = `hsl(${(i * 36 + j * 18) % 360} 70% ${(i + j) % 2 ? 60 : 75}%)`;
      x.fillRect((i * w) / 10, (j * h) / 10, w / 10, h / 10);
    }
  x.strokeStyle = "#000";
  x.lineWidth = 6;
  x.strokeRect(3, 3, w - 6, h - 6);
  x.fillStyle = "#000";
  x.font = "bold 90px sans-serif";
  x.textAlign = "center";
  x.fillText(label, w / 2, h / 2);
  x.font = "bold 48px sans-serif";
  for (let i = 0; i <= 10; i++) {
    x.fillText(String(i), (i * w) / 10, 60);
    x.fillText(String(i), 40, (i * h) / 10 + 16);
  }
  return c.toDataURL("image/png");
}

const EMPTY: never[] = [];

/** labelled 50 px grid in photo coordinates, drawn over the preview */
function GridOverlay({ photo }: { photo: string }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = photo;
  }, [photo]);
  if (!size) return null;
  const lines = [];
  for (let x = 0; x <= size.w; x += 50) lines.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={size.h} stroke={x % 100 ? "rgba(255,0,0,0.25)" : "rgba(255,0,0,0.6)"} strokeWidth={1} />);
  for (let y = 0; y <= size.h; y += 50) lines.push(<line key={`y${y}`} x1={0} y1={y} x2={size.w} y2={y} stroke={y % 100 ? "rgba(255,0,0,0.25)" : "rgba(255,0,0,0.6)"} strokeWidth={1} />);
  const labels = [];
  for (let x = 100; x < size.w; x += 100) labels.push(<text key={`lx${x}`} x={x + 2} y={14} fontSize={13} fill="#d00" fontWeight={700}>{x}</text>);
  for (let y = 100; y < size.h; y += 100) labels.push(<text key={`ly${y}`} x={2} y={y - 3} fontSize={13} fill="#d00" fontWeight={700}>{y}</text>);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="none">
      {lines}
      {labels}
    </svg>
  );
}

export default function PreviewLab({ printfulId, name }: { printfulId: number; name: string }) {
  const views = PHOTO_PREVIEWS[printfulId] ?? EMPTY;
  // client-only value (canvas); empty during SSR
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  const prints = useMemo<Record<string, string | null>>(() => {
    if (!mounted) return {};
    const placements = Array.from(new Set(views.flatMap((v) => v.layers.map((l) => l.placement))));
    return Object.fromEntries(placements.map((p) => [p, testPrint(p, 0.78)]));
  }, [views, mounted]);
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">{name} — photo preview lab</h1>
      <p className="text-sm text-gray-600">Each placement gets a labelled grid; tune quads/masks in src/lib/photoPreviewConfig.ts.</p>
      <div className="mt-4 flex flex-wrap gap-6">
        {views.map((v) => (
          <div key={v.id}>
            <div className="mb-1 text-sm font-semibold">{v.label}</div>
            <div className="relative inline-block">
              <PhotoPreviewCanvas view={v} prints={prints} className="block w-[470px] rounded border" />
              <GridOverlay photo={v.photo} />
            </div>
          </div>
        ))}
        {views.length === 0 && <div className="text-sm text-gray-500">No photo previews configured for this product.</div>}
      </div>
    </div>
  );
}
