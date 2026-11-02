"use client";
import { useMemo, useState } from "react";
import { useDesigner } from "@/store/designer";
import { usePlacementPreviews } from "./hooks";
import MockupCanvas from "./MockupCanvas";

export default function MockupView() {
  const product = useDesigner((s) => s.product)!;
  const size = useDesigner((s) => s.size);
  const stitch = useDesigner((s) => s.stitch);
  const prints = usePlacementPreviews();
  const blank = useMemo(() => Object.fromEntries(Object.keys(prints).map((k) => [k, { dataUrl: null }])), [prints]);
  const items = useMemo(
    () => [
      { id: "blank", label: "Blank", view: "front" as const, prints: blank },
      { id: "front", label: "Front", view: "front" as const, prints },
      { id: "back", label: "Back", view: "back" as const, prints },
    ],
    [prints, blank],
  );
  const [sel, setSel] = useState("front");
  const current = items.find((i) => i.id === sel) ?? items[1];

  return (
    <div className="m-6 flex min-h-0 flex-1 overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className="w-[46%] shrink-0 border-r border-gray-200 p-4">
        <div className="grid grid-cols-4 gap-3">
          {items.map((it) => (
            <button key={it.id} onClick={() => setSel(it.id)} className={`overflow-hidden rounded-md border bg-[#f3f4f6] ${sel === it.id ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-500"}`} title={it.label}>
              <MockupCanvas product={product} size={size} view={it.view} stitch={stitch} prints={it.prints} className="aspect-[5/6] w-full" />
            </button>
          ))}
        </div>
        <div className="mt-4 text-[12px] text-gray-500">
          Mockups are generated from your print files and the {product.stitchColors ? `${stitch ?? "White"} stitch` : "selected"} option. Change placement designs to update them.
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center p-6">
        <MockupCanvas product={product} size={size} view={current.view} stitch={stitch} prints={current.prints} className="max-h-full max-w-full rounded-md" />
      </div>
    </div>
  );
}
