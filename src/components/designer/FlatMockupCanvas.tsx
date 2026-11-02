"use client";
import { useEffect, useRef } from "react";
import type { TemplateInfo } from "@/lib/printful/types";
import { renderFlatMockup } from "@/lib/flatMockup";

/** Print file composited into a Printful design template (flat preview). */
export default function FlatMockupCanvas({ template, print, background = "#f3f4f6", className }: { template: TemplateInfo; print: string | null; background?: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) void renderFlatMockup(ref.current, template, print, background);
  }, [template, print, background]);
  return <canvas ref={ref} className={className} />;
}
