import Link from "next/link";
import { formatPrice } from "@/lib/catalog";
import { loadAllProducts } from "@/lib/products.server";
import { SiteHeader } from "@/components/product/ProductPage";
import ProductCardImage from "@/components/product/ProductCardImage";

export default async function Home() {
  const products = await loadAllProducts();
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pb-20">
        <h1 className="pt-10 text-[28px] font-bold text-gray-900">All-over print products</h1>
        <p className="mt-2 text-[14px] text-gray-600">Pick a product and open the design maker to print edge to edge on every panel.</p>
        <div className="mt-8 grid grid-cols-3 gap-6">
          {products.map((p) => (
            <Link key={p.slug} href={`/custom/${p.slug}`} className="group overflow-hidden rounded-lg border border-gray-200 hover:border-gray-400 hover:shadow-md">
              <div className="bg-[#f3f4f6]">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" />
                ) : (
                  <ProductCardImage product={p} />
                )}
              </div>
              <div className="p-4">
                <div className="text-[12px] text-gray-500">{p.category}</div>
                <div className="mt-0.5 text-[15px] font-semibold text-gray-900 group-hover:underline">{p.name}</div>
                <div className="mt-2 flex items-center justify-between text-[13px]">
                  <span className="font-bold">{formatPrice(p.price)}</span>
                  <span className="text-gray-500">
                    ★ {p.rating} · {p.reviews} reviews
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
