"use client";
import { useState } from "react";
import { Check, Slash } from "lucide-react";
import { useDesigner } from "@/store/designer";
import { getCanvas, setBackgroundColor, setBackgroundPattern, clearBackground } from "@/lib/engine";
import { PALETTE, swatchName, hexToRgb } from "@/lib/palette";
import { QUICK_DESIGNS } from "@/lib/quickDesigns";
import { ALL_CLIPARTS, svgToDataUrl } from "@/lib/cliparts";
import { QuickDesignTile } from "./QuickDesignsPanel";

type Tab = "colors" | "graphics" | "patterns" | "premium";

export default function FillPanel() {
  const product = useDesigner((s) => s.product)!;
  const pid = useDesigner((s) => s.activePlacement);
  const bg = useDesigner((s) => s.bg[pid]);
  const setBg = useDesigner((s) => s.setBg);
  const applyAll = useDesigner((s) => s.applyBgAll);
  const setApplyAll = useDesigner((s) => s.setApplyBgAll);
  const [tab, setTab] = useState<Tab>("colors");
  const [custom, setCustom] = useState("#ff8800");

  const targets = () => (applyAll ? product.placements.map((p) => p.id) : [pid]);

  const applyColor = (hex: string | null) => {
    targets().forEach((t) => {
      const c = getCanvas(t);
      if (!c) return;
      if (hex) setBackgroundColor(c, hex);
      else clearBackground(c);
      setBg(t, hex);
    });
  };

  const applyPattern = async (tileSvg: string, tileName: string, tileIn: number, mode: "grid" | "half-drop" | "half-brick" | "mirror" | "row" | "column", under: string) => {
    for (const t of targets()) {
      const c = getCanvas(t);
      if (!c) continue;
      await setBackgroundPattern(c, { tileSrc: svgToDataUrl(tileSvg), tileName, mode, tileIn }, under);
      setBg(t, under);
    }
  };

  const rgb = bg ? hexToRgb(bg) : null;

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[13px] text-gray-800">
          <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="h-4 w-4 accent-[#1f5fa8]" />
          Apply background to all placements
        </label>
        {bg && (
          <button onClick={() => applyColor(null)} className="text-[12px] text-[#1f5fa8] hover:underline">
            Clear
          </button>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {(
          [
            ["colors", "Colors"],
            ["graphics", "Graphics"],
            ["patterns", "Patterns"],
            ["premium", "Premium Images"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${tab === id ? "border-gray-900 text-gray-900" : "border-gray-300 text-gray-600 hover:border-gray-500"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "colors" && (
        <>
          <div className="mt-4 h-5 text-[13px] text-gray-700">
            {bg ? (
              <>
                {swatchName(bg)} <span className="text-gray-500">(R:{rgb!.r} G:{rgb!.g} B:{rgb!.b})</span>
              </>
            ) : (
              "No background"
            )}
          </div>
          <div className="mt-2 grid grid-cols-9 gap-1">
            <button onClick={() => applyColor(null)} title="None" className={`flex h-9 w-9 items-center justify-center rounded border ${!bg ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-300"}`}>
              <Slash className="h-4 w-4 text-gray-500" />
            </button>
            <label title="Custom color" className="relative h-9 w-9 cursor-pointer rounded border border-gray-300" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}>
              <input
                type="color"
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  applyColor(e.target.value);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            {PALETTE.map((s) => {
              const on = bg?.toLowerCase() === s.hex.toLowerCase();
              return (
                <button key={s.hex} onClick={() => applyColor(s.hex)} title={s.name} className={`flex h-9 w-9 items-center justify-center rounded border ${on ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"}`} style={{ background: s.hex }}>
                  {on && <Check className={`h-4 w-4 ${s.hex === "#ffffff" || s.hex === "#f1f1f1" ? "text-gray-900" : "text-white"}`} />}
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === "graphics" && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {ALL_CLIPARTS.map((item) => (
            <button key={item.id} onClick={() => void applyPattern(item.svg, item.name, 2, "half-drop", bg ?? "#ffffff")} title={`Tile ${item.name} as background`} className="aspect-square rounded-md border border-gray-200 p-1 hover:border-gray-500">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={svgToDataUrl(item.svg)} alt={item.name} className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}

      {tab === "patterns" && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {QUICK_DESIGNS.map((q) => (
            <QuickDesignTile key={q.id} q={q} onClick={() => void applyPattern(q.tileSvg, q.tileName, q.tileIn, q.mode, q.bg)} />
          ))}
        </div>
      )}

      {tab === "premium" && <div className="mt-6 rounded-md border border-dashed border-gray-300 p-6 text-center text-[13px] text-gray-500">Premium stock images are a paid library. Connect a stock-image provider to populate this tab.</div>}
    </div>
  );
}
