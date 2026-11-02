"use client";
import { useMemo } from "react";
import type { ProductDef } from "@/lib/catalog";
import MockupCanvas from "@/components/designer/MockupCanvas";

export default function ProductCardImage({ product }: { product: ProductDef }) {
  const blank = useMemo(() => Object.fromEntries(product.placements.map((p) => [p.id, { dataUrl: null }])), [product]);
  return <MockupCanvas product={product} size={product.sizes[0]} view="front" stitch="White" prints={blank} className="w-full" />;
}
