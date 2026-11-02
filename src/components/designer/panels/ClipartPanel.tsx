"use client";
import { useMemo, useState } from "react";
import { Search, LayoutGrid, ListFilter } from "lucide-react";
import { useDesigner } from "@/store/designer";
import { useActiveCanvas } from "../hooks";
import { addSvgLayer } from "@/lib/engine";
import { CLIPART_CATEGORIES, svgToDataUrl, type Clipart } from "@/lib/cliparts";

const TAGS = ["leaves", "marine life & ocean", "back-to-school", "inspired by nature", "colorful expressions", "sweet ice creams", "collage art", "self-love"];

export default function ClipartPanel() {
  const c = useActiveCanvas();
  const setTool = useDesigner((s) => s.setTool);
  const setContextTool = useDesigner((s) => s.setContextTool);
  const [q, setQ] = useState("");

  const cats = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return CLIPART_CATEGORIES;
    return CLIPART_CATEGORIES.map((cat) => ({ ...cat, items: cat.items.filter((i) => i.name.toLowerCase().includes(needle) || i.tags.some((t) => t.includes(needle))) })).filter((cat) => cat.items.length);
  }, [q]);

  const add = async (item: Clipart) => {
    if (!c) return;
    await addSvgLayer(c, item.svg, item.name);
    setTool("layers");
    setContextTool("transform");
  };

  return (
    <div className="px-5 py-5">
      <label className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clipart" className="w-full text-[14px] outline-none" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {TAGS.map((t) => (
          <button key={t} onClick={() => setQ(t.split(" ")[0])} className="rounded-full border border-gray-300 px-3 py-1 text-[11px] text-gray-700 hover:border-gray-600">
            {t}
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <button className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-[12px] font-semibold">
          <LayoutGrid className="h-3.5 w-3.5" /> All cliparts ▾
        </button>
        <button className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-[12px] font-semibold">
          <ListFilter className="h-3.5 w-3.5" /> Filter ▾
        </button>
      </div>

      {cats.map((cat) => (
        <section key={cat.id} className="mt-6">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-gray-900">{cat.name}</div>
            <a href="#more" className="text-[12px] text-[#1f5fa8] hover:underline">
              See more
            </a>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {cat.items.map((item) => (
              <button key={item.id} onClick={() => void add(item)} title={item.name} className="aspect-square rounded-md p-1 hover:bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={svgToDataUrl(item.svg)} alt={item.name} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </section>
      ))}
      {cats.length === 0 && <div className="mt-8 text-center text-[13px] text-gray-500">No clipart matches “{q}”.</div>}
    </div>
  );
}
