import type { PanelShape } from "./catalog";

/**
 * Cut-and-sew panel outlines. Every path is expressed in the placement's own
 * coordinate space (0..W, 0..H) so it can be used both as the on-canvas template
 * overlay and as the clip region when compositing mockups.
 */
export function panelPath(shape: PanelShape, W: number, H: number, side: "front" | "back" = "front"): string {
  switch (shape) {
    case "square": {
      const r = Math.min(W, H) * 0.02;
      return `M${r} 0 H${W - r} Q${W} 0 ${W} ${r} V${H - r} Q${W} ${H} ${W - r} ${H} H${r} Q0 ${H} 0 ${H - r} V${r} Q0 0 ${r} 0 Z`;
    }
    case "body": {
      const shoulderW = W * 0.72;
      const neckW = W * 0.3;
      const neckDepth = side === "front" ? H * 0.09 : H * 0.03;
      const sy = H * 0.035;
      const armY = H * 0.24;
      const sx0 = (W - shoulderW) / 2;
      const sx1 = W - sx0;
      const nx0 = (W - neckW) / 2;
      const nx1 = W - nx0;
      return [
        `M${nx0} 0`,
        `Q${W / 2} ${neckDepth * 2} ${nx1} 0`,
        `L${sx1} ${sy}`,
        `C${sx1 + (W - sx1) * 0.15} ${sy + (armY - sy) * 0.35} ${W} ${armY * 0.75} ${W} ${armY}`,
        `L${W} ${H}`,
        `L0 ${H}`,
        `L0 ${armY}`,
        `C0 ${armY * 0.75} ${sx0 - sx0 * 0.15} ${sy + (armY - sy) * 0.35} ${sx0} ${sy}`,
        `Z`,
      ].join(" ");
    }
    case "sleeve": {
      const capY = Math.min(H * 0.18, W * 0.5);
      const cuffInset = W * 0.2;
      return `M0 ${capY} C${W * 0.3} 0 ${W * 0.7} 0 ${W} ${capY} L${W - cuffInset} ${H} L${cuffInset} ${H} Z`;
    }
    case "backpack": {
      const r = W * 0.1;
      const top = W * 0.35;
      return `M${r} ${top * 0.4} C${W * 0.2} 0 ${W * 0.8} 0 ${W - r} ${top * 0.4} Q${W} ${top * 0.6} ${W} ${top} V${H - r} Q${W} ${H} ${W - r} ${H} H${r} Q0 ${H} 0 ${H - r} V${top} Q0 ${top * 0.6} ${r} ${top * 0.4} Z`;
    }
    case "side": {
      const r = W * 0.3;
      return `M0 ${r} Q0 0 ${r} 0 H${W - r} Q${W} 0 ${W} ${r} V${H} H0 Z`;
    }
  }
}

/** Dashed "safe print area": the panel scaled inward around its center. */
export function safeAreaTransform(W: number, H: number, insetIn = 0.9, pxPerIn = 40) {
  const inset = insetIn * pxPerIn;
  const sx = (W - inset * 2) / W;
  const sy = (H - inset * 2) / H;
  return `translate(${W / 2} ${H / 2}) scale(${sx} ${sy}) translate(${-W / 2} ${-H / 2})`;
}

export function panelLabels(shape: PanelShape, side: "front" | "back" | undefined) {
  const labels: { text: string; at: "collar" | "safe" }[] = [];
  if (shape === "body") labels.push({ text: "Collar", at: "collar" });
  labels.push({ text: "Safe Print Area", at: "safe" });
  void side;
  return labels;
}
