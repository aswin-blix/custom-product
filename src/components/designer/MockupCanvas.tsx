"use client";
import { useEffect, useRef } from "react";
import type { ProductDef } from "@/lib/catalog";
import { renderMockup, type PrintInput } from "@/lib/mockup";

interface Props {
  product: ProductDef;
  size: string;
  view: "front" | "back";
  stitch: "White" | "Black" | null;
  prints: Record<string, PrintInput>;
  background?: string;
  className?: string;
}

export default function MockupCanvas({ product, size, view, stitch, prints, background, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) void renderMockup(ref.current, { product, size, view, stitch, prints, background });
  }, [product, size, view, stitch, prints, background]);
  return <canvas ref={ref} className={className} />;
}
