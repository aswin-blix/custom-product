"use client";
import { useEffect, useRef, useState } from "react";
import { useDesigner } from "@/store/designer";
import { placementDims, placementTemplate, variantFor } from "@/lib/catalog";
import DesignCanvas from "./DesignCanvas";

export default function CanvasViewport() {
  const product = useDesigner((s) => s.product);
  const size = useDesigner((s) => s.size);
  const color = useDesigner((s) => s.color);
  const active = useDesigner((s) => s.activePlacement);
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setBox({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (!product) return null;
  const variant = variantFor(product, size, color);

  return (
    <div ref={ref} className="relative mx-6 mb-4 flex min-h-0 flex-1 overflow-hidden rounded-md border border-gray-200 bg-[#fbfbfc]">
      {product.placements.map((p) => {
        const d = placementDims(product, p, size, color);
        return (
          <DesignCanvas
            key={p.id}
            placement={p}
            widthIn={d.widthIn}
            heightIn={d.heightIn}
            template={placementTemplate(product, p, size, color)}
            blankImage={variant?.image ?? null}
            box={box}
            active={active === p.id}
          />
        );
      })}
    </div>
  );
}
