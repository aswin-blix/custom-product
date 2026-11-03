import { notFound } from "next/navigation";
import { getProduct, PRODUCTS } from "@/lib/catalog";
import PreviewLab from "./PreviewLab";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

/** Dev aid: renders every photo preview with a labelled grid per placement to tune quads/masks. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <PreviewLab printfulId={product.printfulId} name={product.name} />;
}
