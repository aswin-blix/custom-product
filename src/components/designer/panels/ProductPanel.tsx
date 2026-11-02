"use client";
import { Star, Info } from "lucide-react";
import { useDesigner } from "@/store/designer";

export function StitchSwatch({ color }: { color: string }) {
  const stroke = /white|clear/i.test(color) ? "#ffffff" : "#111111";
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="rounded bg-gray-200">
      <g stroke={stroke} strokeWidth="2.2" strokeLinecap="round">
        <path d="M5 23 l4 -4 M9 19 l4 -4 M13 15 l4 -4 M17 11 l4 -4" />
        <path d="M9 23 l2 -2 M15 17 l2 -2 M21 11 l2 -2" opacity=".6" />
      </g>
    </svg>
  );
}

export default function ProductPanel() {
  const product = useDesigner((s) => s.product)!;
  const size = useDesigner((s) => s.size);
  const setSize = useDesigner((s) => s.setSize);
  const color = useDesigner((s) => s.color);
  const setColor = useDesigner((s) => s.setColor);
  const stitch = useDesigner((s) => s.stitch);
  const setStitch = useDesigner((s) => s.setStitch);

  return (
    <div className="px-5 py-5">
      <h2 className="text-[15px] font-semibold text-gray-900">{product.name}</h2>
      <div className="mt-1 flex items-center gap-2 text-[13px]">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        <span className="font-semibold">{product.rating}</span>
        <a className="text-[#1f5fa8] hover:underline" href="#reviews">
          {product.reviews} Reviews
        </a>
        <span className="mx-1 h-4 w-px bg-gray-300" />
        <Info className="h-3.5 w-3.5 text-gray-400" />
        <a className="text-[#1f5fa8] hover:underline" href="#guidelines">
          Pricing &amp; file guidelines
        </a>
      </div>
      <hr className="my-5 border-gray-200" />

      <div className="text-[12px] font-semibold text-gray-700">Technique</div>
      <div className="mt-1.5 text-[15px] text-gray-800">{product.technique}</div>

      {product.colors && (
        <>
          <div className="mt-6 text-[12px] font-semibold text-gray-700">Color</div>
          <div className="mt-2 flex gap-2">
            {product.colors.map((c) => (
              <button
                key={c.name}
                title={c.name}
                onClick={() => setColor(c.name)}
                className={`flex h-8 w-8 items-center justify-center rounded-md border ${color === c.name ? "border-gray-800" : "border-gray-300"}`}
                style={{ background: c.hex }}
              >
                {color === c.name && <span className="text-gray-800">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 flex items-center justify-between">
        <div className="text-[12px] font-semibold text-gray-700">Size</div>
        <a className="text-[12px] text-[#1f5fa8] hover:underline" href="#size-guide">
          Size guide
        </a>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {product.sizes.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`rounded-md border px-3 py-2 text-[13px] font-semibold ${size === s ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-300 hover:border-gray-500"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {product.stitchColors && (
        <>
          <hr className="my-6 border-gray-200" />
          <div className="text-[15px] font-semibold text-gray-900">{product.stitchLabel ?? "Stitch color"}:</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {product.stitchColors.map((sc) => (
              <button
                key={sc}
                onClick={() => setStitch(sc)}
                className={`flex items-center justify-between rounded-md border px-3 py-2.5 ${stitch === sc ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-300 hover:border-gray-500"}`}
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className={`h-3.5 w-3.5 rounded-full border ${stitch === sc ? "border-gray-900 bg-gray-900 ring-2 ring-inset ring-white" : "border-gray-400"}`} />
                  {sc}
                </span>
                <StitchSwatch color={sc} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
