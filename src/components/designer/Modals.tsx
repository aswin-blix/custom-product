"use client";
import { useState } from "react";
import { X, Download, Play } from "lucide-react";
import { useDesigner } from "@/store/designer";
import { StitchSwatch } from "./panels/ProductPanel";
import { usePlacementPreviews } from "./hooks";
import { exportPrintFile, getCanvas, hasDesign } from "@/lib/engine";
import { EXPORT_DPI, formatPrice, placementDims, placementTemplate, priceFor, variantFor } from "@/lib/catalog";
import MockupCanvas from "./MockupCanvas";
import FlatMockupCanvas from "./FlatMockupCanvas";

function Frame({ title, onClose, children, width = "max-w-xl" }: { title: string; onClose: () => void; children: React.ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`w-full ${width} overflow-hidden rounded-lg bg-white shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-[17px] font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function IntroModal() {
  const seen = useDesigner((s) => s.introSeen);
  const setSeen = useDesigner((s) => s.setIntroSeen);
  if (seen) return null;
  return (
    <Frame title="Ready to design your first AOP product?" onClose={() => setSeen(true)} width="max-w-2xl">
      <div className="px-5 py-4">
        <p className="text-[13px] text-gray-700">If you want to learn how to design trendy and beautiful all-over print products, we have just the video for you!</p>
        <div className="mt-4 flex aspect-video w-full items-center justify-center rounded bg-black text-white/70">
          <Play className="h-12 w-12" />
        </div>
      </div>
      <div className="flex justify-end border-t border-gray-200 px-5 py-3">
        <button onClick={() => setSeen(true)} className="rounded-md bg-[#e5322d] px-5 py-2 text-[14px] font-semibold text-white hover:bg-[#c92a26]">
          Got it
        </button>
      </div>
    </Frame>
  );
}

export function StitchModal() {
  const open = useDesigner((s) => s.stitchModal);
  const setOpen = useDesigner((s) => s.setStitchModal);
  const product = useDesigner((s) => s.product)!;
  const setStitch = useDesigner((s) => s.setStitch);
  const setView = useDesigner((s) => s.setView);
  const [pick, setPick] = useState<string | null>(null);
  if (!open || !product.stitchColors) return null;
  return (
    <Frame title="Select a stitch color" onClose={() => setOpen(false)} width="max-w-md">
      <div className="px-5 py-4">
        <div className="text-[13px] font-semibold text-gray-900">For {product.name}:</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {product.stitchColors.map((sc) => (
            <button key={sc} onClick={() => setPick(sc)} className={`flex items-center justify-between rounded-md border px-3 py-2.5 ${pick === sc ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-300"}`}>
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                <span className={`h-3.5 w-3.5 rounded-full border ${pick === sc ? "border-gray-900 bg-gray-900 ring-2 ring-inset ring-white" : "border-gray-400"}`} />
                {sc}
              </span>
              <StitchSwatch color={sc} />
            </button>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-gray-600">
          <b>Tip:</b> Pick white for lighter designs and black for darker to make the stitches blend in. Do the opposite to make the stitch color pop.
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
        <button onClick={() => setOpen(false)} className="rounded-md bg-gray-100 px-4 py-2 text-[14px] font-semibold text-gray-800 hover:bg-gray-200">
          Cancel
        </button>
        <button
          disabled={!pick}
          onClick={() => {
            setStitch(pick);
            setOpen(false);
            setView("mockups");
          }}
          className="rounded-md bg-[#e5322d] px-4 py-2 text-[14px] font-semibold text-white disabled:bg-[#f3a7a5] hover:enabled:bg-[#c92a26]"
        >
          Select
        </button>
      </div>
    </Frame>
  );
}

export function CartModal() {
  const open = useDesigner((s) => s.cartModal);
  // previews are only computed while the modal is mounted (they rasterize every canvas)
  return open ? <CartModalBody /> : null;
}

function CartModalBody() {
  const setOpen = useDesigner((s) => s.setCartModal);
  const product = useDesigner((s) => s.product)!;
  const size = useDesigner((s) => s.size);
  const stitch = useDesigner((s) => s.stitch);
  const prints = usePlacementPreviews();
  const [files, setFiles] = useState<Record<string, string>>({});

  const generate = () => {
    const out: Record<string, string> = {};
    product.placements.forEach((p) => {
      const c = getCanvas(p.id);
      if (c && hasDesign(c)) out[p.id] = exportPrintFile(c);
    });
    setFiles(out);
  };

  const variant = variantFor(product, size);
  const frontTemplate = placementTemplate(product, product.placements[0], size);
  // Shape of a Printful order item: catalog variant + one print file per placement.
  const payload = {
    product: product.slug,
    catalog_product_id: product.printfulId,
    variant_id: variant?.id ?? null,
    options: stitch ? [{ id: "stitch_color", value: stitch.toLowerCase() }] : [],
    retail_price: priceFor(product, size),
    files: product.placements
      .filter((p) => {
        const c = getCanvas(p.id);
        return c && hasDesign(c);
      })
      .map((p) => {
        const d = placementDims(product, p, size);
        return { type: p.id, printfile_id: variant?.placements[p.id]?.printfileId ?? null, width_px: Math.round(d.widthIn * EXPORT_DPI), height_px: Math.round(d.heightIn * EXPORT_DPI), dpi: EXPORT_DPI, url: "<hosted print file>" };
      }),
  };

  return (
    <Frame title="Added to cart" onClose={() => setOpen(false)} width="max-w-3xl">
      <div className="grid grid-cols-[220px_1fr] gap-5 px-5 py-4">
        {frontTemplate ? (
          <FlatMockupCanvas template={frontTemplate} print={prints[product.placements[0].id]?.dataUrl ?? null} className="w-full rounded-md" />
        ) : (
          <MockupCanvas product={product} size={size} view="front" stitch={stitch} prints={prints} className="w-full rounded-md" />
        )}
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-gray-900">{product.name}</div>
          <div className="mt-1 text-[13px] text-gray-600">
            Size {size}
            {stitch ? ` · ${stitch} stitch` : ""} · {formatPrice(priceFor(product, size))}
          </div>
          <div className="mt-4 text-[12px] font-semibold text-gray-700">Print files ({EXPORT_DPI} DPI)</div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {product.placements.map((p) => {
              const c = getCanvas(p.id);
              const has = c && hasDesign(c);
              const d = placementDims(product, p, size);
              return (
                <div key={p.id} className={`rounded-md border p-2 text-center ${has ? "border-gray-300" : "border-dashed border-gray-200 opacity-50"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {prints[p.id]?.dataUrl && has ? <img src={prints[p.id].dataUrl!} alt={p.label} className="mx-auto h-16 object-contain" /> : <div className="h-16" />}
                  <div className="mt-1 text-[11px] font-semibold">{p.label}</div>
                  <div className="text-[10px] text-gray-500">
                    {d.widthIn * EXPORT_DPI}×{d.heightIn * EXPORT_DPI}px
                  </div>
                  {files[p.id] && (
                    <a href={files[p.id]} download={`${product.slug}-${p.id}.png`} className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#1f5fa8] hover:underline">
                      <Download className="h-3 w-3" /> PNG
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={generate} className="mt-3 rounded-md border border-gray-400 px-3 py-1.5 text-[12px] font-semibold hover:bg-gray-50">
            Generate print files
          </button>
          <div className="mt-4 text-[12px] font-semibold text-gray-700">Order payload</div>
          <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-900 p-3 text-[11px] leading-snug text-gray-100">{JSON.stringify(payload, null, 2)}</pre>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
        <button onClick={() => setOpen(false)} className="rounded-md bg-gray-100 px-4 py-2 text-[14px] font-semibold text-gray-800 hover:bg-gray-200">
          Continue designing
        </button>
        <button onClick={() => setOpen(false)} className="rounded-md bg-[#e5322d] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#c92a26]">
          View cart
        </button>
      </div>
    </Frame>
  );
}
