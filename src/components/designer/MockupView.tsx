"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Info } from "lucide-react";
import { useDesigner } from "@/store/designer";
import { usePlacementPreviews } from "./hooks";
import MockupCanvas from "./MockupCanvas";
import FlatMockup from "./FlatMockupCanvas";
import { PhotoMockupCanvas, useDesignSources, useMockupManifest } from "./PhotoMockups";
import PhotoPreviewCanvas from "./PhotoPreviewCanvas";
import { PHOTO_PREVIEWS } from "@/lib/photoPreviewConfig";
import { placementTemplate, variantFor, EXPORT_DPI } from "@/lib/catalog";
import { getCanvas, exportPrintFile, hasDesign } from "@/lib/engine";
import type { MockupResult } from "@/lib/printful/types";

type Remote = { state: "idle" } | { state: "loading"; step: string } | { state: "unavailable"; reason: string } | { state: "done"; items: { id: string; label: string; url: string }[] };

/** Live Printful Mockup Generator is opt-in; previews work without it. */
const LIVE_MOCKUPS = process.env.NEXT_PUBLIC_PRINTFUL_LIVE_MOCKUPS === "1";

export default function MockupView() {
  const product = useDesigner((s) => s.product)!;
  const size = useDesigner((s) => s.size);
  const color = useDesigner((s) => s.color);
  const stitch = useDesigner((s) => s.stitch);
  const prints = usePlacementPreviews();
  const variant = variantFor(product, size, color);
  const manifest = useMockupManifest(product.printfulId);
  const sources = useDesignSources(manifest, product, prints);
  const [remote, setRemote] = useState<Remote>({ state: "idle" });
  const [sel, setSel] = useState<string>("");

  /* ---- optional live Printful mockups ---- */
  useEffect(() => {
    if (!LIVE_MOCKUPS || !product.live || !variant) return;
    let cancelled = false;
    (async () => {
      setRemote({ state: "loading", step: "Uploading print files…" });
      const files: { placement: string; imageUrl: string; width: number; height: number }[] = [];
      for (const p of product.placements) {
        const c = getCanvas(p.id);
        const vp = variant.placements[p.id];
        if (!c || !vp || !hasDesign(c)) continue;
        const res = await fetch("/api/prints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl: exportPrintFile(c) }) });
        if (!res.ok) {
          if (!cancelled) setRemote({ state: "unavailable", reason: res.status === 409 ? "Live mockups need a public URL (PUBLIC_BASE_URL)." : `Upload failed (${res.status}).` });
          return;
        }
        const { url } = (await res.json()) as { url: string };
        files.push({ placement: p.id, imageUrl: url, width: Math.round(vp.widthIn * (vp.dpi ?? EXPORT_DPI)), height: Math.round(vp.heightIn * (vp.dpi ?? EXPORT_DPI)) });
      }
      if (cancelled || !files.length) return;
      setRemote({ state: "loading", step: "Generating Printful mockups…" });
      const res = await fetch("/api/printful/mockups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.printfulId, variantId: variant.id, files }) });
      if (cancelled) return;
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setRemote({ state: "unavailable", reason: err.error ?? `Mockup generation failed (${res.status}).` });
        return;
      }
      const data = (await res.json()) as { mockups: MockupResult[] };
      const items = data.mockups.flatMap((m) => [{ id: `live-${m.placement}`, label: m.placement, url: m.url }, ...m.extra.map((e, i) => ({ id: `live-${m.placement}-${i}`, label: e.title, url: e.url }))]);
      setRemote({ state: "done", items });
    })().catch((e) => !cancelled && setRemote({ state: "unavailable", reason: (e as Error).message }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.printfulId, variant?.id]);

  /* ---- template previews (always available) ---- */
  const flat = useMemo(
    () =>
      product.placements
        .map((p) => ({ id: `flat-${p.id}`, label: `${p.label} (template)`, template: placementTemplate(product, p, size, color), print: prints[p.id]?.dataUrl ?? null }))
        .filter((x) => !!x.template),
    [product, size, color, prints],
  );
  const blank = useMemo(() => Object.fromEntries(Object.keys(prints).map((k) => [k, { dataUrl: null }])), [prints]);

  type Item = { id: string; label: string };
  // hand-authored product previews: only when no captured Printful views exist
  const productViews = manifest ? [] : (PHOTO_PREVIEWS[product.printfulId] ?? []);
  const printUrls = useMemo(() => Object.fromEntries(Object.entries(prints).map(([k, v]) => [k, v.dataUrl])), [prints]);
  const productItems: Item[] = productViews.map((v) => ({ id: `product-${v.id}`, label: v.label }));
  const photoItems: Item[] = manifest ? manifest.views.map((v) => ({ id: `photo-${v.id}`, label: v.label })) : [];
  const liveItems: Item[] = remote.state === "done" ? remote.items : [];
  const list: Item[] = [...productItems, ...photoItems, ...liveItems, ...flat.map((f) => ({ id: f.id, label: f.label }))];
  const current = sel && list.some((l) => l.id === sel) ? sel : list[0]?.id;

  const render = (id: string, className: string) => {
    if (id.startsWith("product-")) {
      const view = productViews.find((v) => `product-${v.id}` === id);
      if (view) return <PhotoPreviewCanvas view={view} prints={printUrls} className={className} />;
    }
    if (manifest && id.startsWith("photo-")) {
      const view = manifest.views.find((v) => `photo-${v.id}` === id);
      if (view) return <PhotoMockupCanvas view={view} manifest={manifest} sources={sources} className={className} />;
    }
    if (remote.state === "done") {
      const it = remote.items.find((i) => i.id === id);
      // eslint-disable-next-line @next/next/no-img-element
      if (it) return <img src={it.url} alt={it.label} className={className} />;
    }
    const f = flat.find((x) => x.id === id);
    if (f) return <FlatMockup template={f.template!} print={f.print} className={className} />;
    return <MockupCanvas product={product} size={size} view="front" stitch={stitch} prints={blank} className={className} />;
  };

  return (
    <div className="m-6 flex min-h-0 flex-1 overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className="w-[46%] shrink-0 overflow-y-auto border-r border-gray-200 p-4">
        {remote.state === "loading" && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-[#eaf4fd] px-3 py-2 text-[13px] text-[#1f5fa8]">
            <Loader2 className="h-4 w-4 animate-spin" /> {remote.step}
          </div>
        )}
        {remote.state === "unavailable" && (
          <div className="mb-3 flex items-start gap-2 rounded-md bg-gray-100 px-3 py-2 text-[12px] text-gray-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" /> {remote.reason}
          </div>
        )}
        {manifest === null && photoItems.length === 0 && productItems.length === 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-md bg-gray-100 px-3 py-2 text-[12px] text-gray-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" /> No product photo preview configured for this product yet. Showing template previews.
          </div>
        )}
        <div className="grid grid-cols-4 gap-3">
          {list.map((it) => (
            <button key={it.id} onClick={() => setSel(it.id)} title={it.label} className={`overflow-hidden rounded-md border bg-[#f3f4f6] ${current === it.id ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-500"}`}>
              {render(it.id, "aspect-square w-full object-cover")}
              <div className="truncate px-1 py-1 text-[10px] text-gray-600">{it.label}</div>
            </button>
          ))}
          {list.length === 0 &&
            (["front", "back"] as const).map((v) => (
              <button key={v} onClick={() => setSel(v)} className={`overflow-hidden rounded-md border bg-[#f3f4f6] ${current === v ? "border-gray-900" : "border-gray-200"}`}>
                <MockupCanvas product={product} size={size} view={v} stitch={stitch} prints={prints} className="aspect-[5/6] w-full" />
              </button>
            ))}
        </div>
        <div className="mt-4 text-[12px] text-gray-500">
          Previews are rendered locally from your print files{manifest ? " using captured product photos" : ""}.{product.stitchColors && stitch ? ` Stitch: ${stitch}.` : ""}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center p-6">
        {current && list.length > 0 ? render(current, "max-h-full max-w-full rounded-md object-contain") : <MockupCanvas product={product} size={size} view={current === "back" ? "back" : "front"} stitch={stitch} prints={prints} className="max-h-full max-w-full rounded-md" />}
      </div>
    </div>
  );
}
