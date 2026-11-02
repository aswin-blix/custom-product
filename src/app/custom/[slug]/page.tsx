import { notFound } from "next/navigation";
import { PRODUCTS } from "@/lib/catalog";
import { loadProduct } from "@/lib/products.server";
import ProductPage from "@/components/product/ProductPage";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = PRODUCTS.find((p) => p.slug === slug);
  return { title: product ? `${product.name} | Custom Products` : "Product" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();
  return <ProductPage product={product} />;
}
