"use client";
import type { TemplateInfo } from "./printful/types";
import { loadImage } from "./pattern";

/**
 * "Flat" mockup from a Printful design template: the print file is drawn into
 * the template's print area and the template outline is composited on top.
 * Used when the live Mockup Generator is unavailable (no public URL).
 */
export async function renderFlatMockup(canvas: HTMLCanvasElement, template: TemplateInfo, printDataUrl: string | null, background = "#ffffff") {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const scale = 1000 / template.templateWidth;
  canvas.width = 1000;
  canvas.height = Math.round(template.templateHeight * scale);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const [tpl, print] = await Promise.all([loadImage(template.imageUrl), printDataUrl ? loadImage(printDataUrl) : Promise.resolve(null)]);
  if (print) {
    ctx.drawImage(print, template.printAreaLeft * scale, template.printAreaTop * scale, template.printAreaWidth * scale, template.printAreaHeight * scale);
  }
  ctx.drawImage(tpl, 0, 0, canvas.width, canvas.height);
}
