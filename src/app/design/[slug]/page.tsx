import { notFound } from "next/navigation";
import { PRODUCTS } from "@/lib/catalog";
import { loadProduct } from "@/lib/products.server";
import DesignerLoader from "@/components/designer/DesignerLoader";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = PRODUCTS.find((p) => p.slug === slug);
  return { title: product ? `Design: ${product.name}` : "Design maker" };
}

export default async function DesignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();
  return <DesignerLoader product={product} />;
}
