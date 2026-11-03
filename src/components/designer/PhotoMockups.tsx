"use client";
import { useEffect, useRef, useState } from "react";
import type { ProductDef } from "@/lib/catalog";
import { loadManifest, loadDisplacementMap, designSourceFromDataUrl, renderPhotoMockup, type MockupManifest, type DesignSource } from "@/lib/photoMockup";

export function useMockupManifest(productId: number) {
  const [manifest, setManifest] = useState<MockupManifest | null | undefined>(undefined);
  useEffect(() => {
    let on = true;
    void loadManifest(productId).then((m) => on && setManifest(m));
    return () => {
      on = false;
    };
  }, [productId]);
  return manifest;
}

/** Design previews keyed by calibration placement index, derived from the print files. */
export function useDesignSources(manifest: MockupManifest | null | undefined, product: ProductDef, prints: Record<string, { dataUrl: string | null }>) {
  const [sources, setSources] = useState<Map<number, DesignSource>>(new Map());
  useEffect(() => {
    if (!manifest) return;
    let on = true;
    (async () => {
      const next = new Map<number, DesignSource>();
      for (const p of manifest.placements) {
        const url = prints[p.placement]?.dataUrl;
        if (url) next.set(p.index, await designSourceFromDataUrl(url));
      }
      if (on) setSources(next);
    })();
    return () => {
      on = false;
    };
  }, [manifest, prints, product]);
  return sources;
}

export function PhotoMockupCanvas({ view, manifest, sources, className }: { view: MockupManifest["views"][number]; manifest: MockupManifest; sources: Map<number, DesignSource>; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let on = true;
    void loadDisplacementMap(view, manifest).then((map) => {
      if (on && ref.current) renderPhotoMockup(ref.current, map, sources);
    });
    return () => {
      on = false;
    };
  }, [view, manifest, sources]);
  return <canvas ref={ref} className={className} />;
}
