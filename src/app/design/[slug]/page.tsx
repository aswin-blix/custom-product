import { notFound } from "next/navigation";
import { getProduct, PRODUCTS } from "@/lib/catalog";
import DesignerLoader from "@/components/designer/DesignerLoader";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  return { title: product ? `Design: ${product.name}` : "Design maker" };
}

export default async function DesignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <DesignerLoader product={product} />;
}
