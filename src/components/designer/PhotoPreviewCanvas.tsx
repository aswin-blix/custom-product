"use client";
import { useEffect, useRef } from "react";
import { renderPhotoPreview, type PreviewView } from "@/lib/photoPreview";

export default function PhotoPreviewCanvas({ view, prints, className }: { view: PreviewView; prints: Record<string, string | null>; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let on = true;
    const el = ref.current;
    if (!el) return;
    void renderPhotoPreview(el, view, prints).catch(() => on && undefined);
    return () => {
      on = false;
    };
  }, [view, prints]);
  return <canvas ref={ref} className={className} />;
}
