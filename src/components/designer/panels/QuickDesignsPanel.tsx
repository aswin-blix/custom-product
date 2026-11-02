"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useDesigner } from "@/store/designer";
import { getCanvas, addPatternLayer, setBackgroundColor } from "@/lib/engine";
import { QUICK_DESIGNS, QUICK_DESIGN_CATEGORIES, type QuickDesign } from "@/lib/quickDesigns";
import { svgToDataUrl } from "@/lib/cliparts";

export function QuickDesignTile({ q, onClick, size = "" }: { q: QuickDesign; onClick?: () => void; size?: string }) {
  return (
    <button
      onClick={onClick}
      title={q.name}
      className={`aspect-square w-full rounded-md border border-gray-200 hover:border-gray-500 ${size}`}
      style={{
        backgroundColor: q.bg,
        backgroundImage: `url("${svgToDataUrl(q.tileSvg)}")`,
        backgroundSize: `${Math.max(18, q.tileIn * 11)}px`,
      }}
    />
  );
}

export function useApplyQuickDesign() {
  const product = useDesigner((s) => s.product);
  const pid = useDesigner((s) => s.activePlacement);
  const applyBgAll = useDesigner((s) => s.applyBgAll);
  const setTool = useDesigner((s) => s.setTool);
  const setBg = useDesigner((s) => s.setBg);
  const [recent, setRecent] = useState<string[]>([]);

  const apply = async (q: QuickDesign) => {
    const c = getCanvas(pid);
    if (!c || !product) return;
    c.getObjects()
      .filter((o) => o.layerType === "pattern" && o.quickDesignId && o.quickDesignId !== "__bg__")
      .forEach((o) => c.remove(o));
    await addPatternLayer(c, {
      tileSrc: svgToDataUrl(q.tileSvg),
      tileName: q.tileName,
      mode: q.mode,
      tileIn: q.tileIn,
      quickDesignId: q.id,
      quickDesignName: q.name,
    });
    const targets = applyBgAll ? product.placements.map((p) => p.id) : [pid];
    targets.forEach((t) => {
      const tc = getCanvas(t);
      if (tc) setBackgroundColor(tc, q.bg);
      setBg(t, q.bg);
    });
    setRecent((r) => [q.id, ...r.filter((x) => x !== q.id)].slice(0, 6));
    setTool("layers");
  };
  return { apply, recent };
}

export default function QuickDesignsPanel() {
  const [q, setQ] = useState("");
  const { apply, recent } = useApplyQuickDesign();
  const needle = q.trim().toLowerCase();
  const filtered = useMemo(() => QUICK_DESIGNS.filter((d) => !needle || d.name.toLowerCase().includes(needle) || d.tileName.toLowerCase().includes(needle) || d.category.toLowerCase().includes(needle)), [needle]);

  return (
    <div className="px-5 py-5">
      <label className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search quick designs" className="w-full text-[14px] outline-none" />
      </label>

      {recent.length > 0 && !needle && (
        <section className="mt-6">
          <div className="text-[13px] font-semibold text-gray-900">Recently used</div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {recent.map((id) => {
              const d = QUICK_DESIGNS.find((x) => x.id === id)!;
              return <QuickDesignTile key={id} q={d} onClick={() => void apply(d)} />;
            })}
          </div>
        </section>
      )}

      {QUICK_DESIGN_CATEGORIES.map((cat) => {
        const items = filtered.filter((d) => d.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat} className="mt-6">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-gray-900">{cat}</div>
              <a href="#more" className="text-[12px] text-[#1f5fa8] hover:underline">
                See more
              </a>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {items.map((d) => (
                <QuickDesignTile key={d.id} q={d} onClick={() => void apply(d)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
