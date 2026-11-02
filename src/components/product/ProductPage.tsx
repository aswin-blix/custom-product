"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Star, ChevronDown, Search } from "lucide-react";
import { formatPrice, priceFor, type ProductDef } from "@/lib/catalog";
import MockupCanvas from "@/components/designer/MockupCanvas";

let deliveryCache: string | null = null;
function deliveryWindow() {
  if (deliveryCache) return deliveryCache;
  const a = new Date();
  a.setDate(a.getDate() + 11);
  const b = new Date(a);
  b.setDate(b.getDate() + 3);
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  deliveryCache = `${f(a)}–${b.getDate()}`;
  return deliveryCache;
}

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 text-[18px] font-extrabold tracking-tight">
          <span className="inline-block h-5 w-5 rotate-45 rounded-sm bg-gradient-to-br from-red-500 via-amber-400 to-blue-500" />
          CUSTOMLY
        </Link>
        <div className="flex rounded-md bg-gray-100 p-0.5 text-[13px] font-semibold">
          <span className="rounded px-5 py-1.5 text-gray-600">Sell</span>
          <span className="rounded bg-white px-5 py-1.5 shadow-sm">Shop</span>
        </div>
        <label className="flex w-80 items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-[13px] text-gray-500">
          <Search className="h-4 w-4" /> Search products
        </label>
        <nav className="ml-auto flex gap-5 text-[12px] text-gray-700">
          <span>Preferences</span>
          <span>Sign in</span>
          <span>Sign up</span>
          <span>My cart</span>
        </nav>
      </div>
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-3 text-[13px] text-gray-800">
        {["Products", "Shipping", "Deals & discounts", "Design ideas", "Resources"].map((n) => (
          <span key={n} className="flex items-center gap-1">
            {n} <ChevronDown className="h-3 w-3" />
          </span>
        ))}
      </div>
    </header>
  );
}

export default function ProductPage({ product }: { product: ProductDef }) {
  const [size, setSize] = useState(product.sizes[0]);
  const [view, setView] = useState<"front" | "back">("front");
  const gallery = product.gallery ?? [];
  const [photo, setPhoto] = useState(0);
  const blank = useMemo(() => Object.fromEntries(product.placements.map((p) => [p.id, { dataUrl: null }])), [product]);
  const delivery = useSyncExternalStore(
    () => () => {},
    () => deliveryWindow(),
    () => "",
  );
  const price = priceFor(product, size);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pb-20">
        <nav className="flex gap-2 py-4 text-[12px] text-gray-600">
          {product.breadcrumb.map((b) => (
            <span key={b} className="flex gap-2">
              <span className="text-[#1f5fa8]">{b}</span> <span>/</span>
            </span>
          ))}
          <span className="font-semibold text-gray-900">{product.name}</span>
        </nav>

        <div className="grid grid-cols-[72px_1fr_440px] gap-6">
          {gallery.length > 0 ? (
            <>
              <div className="flex flex-col gap-3">
                {gallery.map((src, i) => (
                  <button key={src} onClick={() => setPhoto(i)} className={`overflow-hidden rounded-md border bg-[#f3f4f6] ${photo === i ? "border-gray-900" : "border-gray-200"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="overflow-hidden rounded-md bg-[#f3f4f6]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gallery[photo] ?? gallery[0]} alt={product.name} className="w-full object-contain" />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {(["front", "back"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`overflow-hidden rounded-md border ${view === v ? "border-gray-900" : "border-gray-200"}`}>
                    <MockupCanvas product={product} size={size} view={v} stitch="White" prints={blank} className="w-full" />
                  </button>
                ))}
              </div>
              <div className="overflow-hidden rounded-md bg-[#f3f4f6]">
                <MockupCanvas product={product} size={size} view={view} stitch="White" prints={blank} className="w-full" />
              </div>
            </>
          )}
          <div>
            <h1 className="text-[20px] font-semibold text-gray-900">{product.name}</h1>
            <div className="mt-2 flex items-center gap-2 text-[13px]">
              <span className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`h-4 w-4 ${i <= Math.round(product.rating) ? "fill-amber-400" : ""}`} />
                ))}
              </span>
              <a href="#reviews" className="text-[#1f5fa8] hover:underline">
                {product.reviews} Reviews
              </a>
            </div>
            <div className="mt-7 flex items-center justify-between">
              <div className="text-[12px] font-semibold text-gray-700">Technique</div>
              <a href="#guidelines" className="text-[12px] text-[#1f5fa8] hover:underline">
                File guidelines
              </a>
            </div>
            <div className="mt-1 text-[14px] text-gray-800">{product.technique}</div>
            <div className="mt-5 flex items-center justify-between">
              <div className="text-[12px] font-semibold text-gray-700">Size</div>
              <a href="#size-guide" className="text-[12px] text-[#1f5fa8] hover:underline">
                Size guide
              </a>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`rounded-md border px-3 py-2 text-[13px] font-semibold ${size === s ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-300 hover:border-gray-500"}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-gray-100 p-4">
                <div className="text-[12px] font-semibold text-gray-700">
                  Price <span className="text-red-500">*</span>
                </div>
                <div className="mt-5 text-[22px] font-bold text-gray-900">{formatPrice(price)}</div>
                <div className="text-[12px] text-gray-600">Print included</div>
              </div>
              <div className="rounded-md bg-gray-100 p-4">
                <div className="text-[12px] font-semibold text-gray-700">Estimated delivery to</div>
                <div className="mt-1 text-[12px]">🇮🇳 India</div>
                <div className="mt-3 text-[18px] font-bold text-gray-900">{delivery}</div>
                <div className="text-[12px] text-gray-600">Shipping starts at $51.99</div>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-gray-100 px-4 py-3 text-[13px] font-semibold text-gray-800">Bulk price calculator ▾</div>
            <Link href={`/design/${product.slug}`} className="mt-4 block rounded-md bg-[#e5322d] py-3.5 text-center text-[15px] font-semibold text-white hover:bg-[#c92a26]">
              Start designing
            </Link>
            <p className="mt-6 text-[13px] leading-relaxed text-gray-700">{product.description}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
