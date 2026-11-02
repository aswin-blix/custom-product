"use client";
import dynamic from "next/dynamic";
import type { ProductDef } from "@/lib/catalog";

// Fabric.js touches `window`/`document` at import time, so the designer is
// client-only and loaded without SSR.
const DesignerShell = dynamic(() => import("./DesignerShell"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-white text-[14px] text-gray-500">
      Loading design maker…
    </div>
  ),
});

export default function DesignerLoader({ product }: { product: ProductDef }) {
  return <DesignerShell product={product} />;
}
