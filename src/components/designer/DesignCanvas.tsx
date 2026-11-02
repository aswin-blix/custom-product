"use client";
import { useEffect, useRef, useState } from "react";
import type { Canvas, FabricObject } from "fabric";
import { Upload as UploadIcon, LayoutGrid } from "lucide-react";
import { useDesigner } from "@/store/designer";
import { PX_PER_INCH, type PlacementDef } from "@/lib/catalog";
import type { TemplateInfo } from "@/lib/printful/types";
import { panelPath, safeAreaTransform } from "@/lib/templates";
import {
  createCanvas,
  fitCanvas,
  getCanvas,
  registerCanvas,
  unregisterCanvas,
  snapshot,
  isRestoring,
  listLayers,
  nudge,
  removeLayer,
  duplicate,
} from "@/lib/engine";
import { useUndoRedo } from "./hooks";
import { useFileImport } from "./useFileImport";

interface Props {
  placement: PlacementDef;
  widthIn: number;
  heightIn: number;
  /** Printful design template (outline + safe area) for this placement, if available */
  template: TemplateInfo | null;
  /** blank product photo shown before any design exists */
  blankImage: string | null;
  box: { w: number; h: number };
  active: boolean;
}

export default function DesignCanvas({ placement, widthIn, heightIn, template, blankImage, box, active }: Props) {
  const elRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const [zoom, setZoomLocal] = useState(1);
  const [showGuides, setShowGuides] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const tick = useDesigner((s) => s.tick);
  const bump = useDesigner((s) => s.bump);
  const pushHistory = useDesigner((s) => s.pushHistory);
  const setSelected = useDesigner((s) => s.setSelected);
  const setContextTool = useDesigner((s) => s.setContextTool);
  const setBg = useDesigner((s) => s.setBg);
  const { undo, redo } = useUndoRedo();
  const { importFiles, openPicker } = useFileImport();

  const W = widthIn * PX_PER_INCH;
  const H = heightIn * PX_PER_INCH;
  const pid = placement.id;

  // template space → logical canvas space
  const s = template ? W / template.printAreaWidth : 1;
  const frame = template ? { w: template.templateWidth * s, h: template.templateHeight * s } : { w: W, h: H };
  const offX = template ? template.printAreaLeft * s : 0;
  const offY = template ? template.printAreaTop * s : 0;

  /* create / destroy the Fabric canvas once */
  useEffect(() => {
    if (!elRef.current) return;
    const c = createCanvas(elRef.current);
    canvasRef.current = c;
    registerCanvas(pid, c);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const commit = () => {
      if (isRestoring(c)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        pushHistory(pid, snapshot(c));
        const bgc = typeof c.backgroundColor === "string" ? c.backgroundColor : null;
        setBg(pid, bgc && bgc !== "#ffffff" ? bgc : null);
        bump();
      }, 120);
    };
    const onSelect = () => {
      const a = c.getActiveObject() as FabricObject | undefined;
      setSelected(a?.layerId ?? null);
      if (a) {
        const st = useDesigner.getState();
        if (a.layerType === "pattern") setContextTool("pattern");
        else if (st.contextTool === "pattern") setContextTool(null);
      }
      bump();
    };
    c.on("object:added", commit);
    c.on("object:removed", commit);
    c.on("object:modified", commit);
    c.on("text:changed", commit);
    c.on("selection:created", onSelect);
    c.on("selection:updated", onSelect);
    c.on("selection:cleared", () => {
      setSelected(null);
      bump();
    });
    pushHistory(pid, snapshot(c));
    return () => {
      if (timer) clearTimeout(timer);
      unregisterCanvas(pid);
      c.dispose();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  /* fit to viewport & handle size changes */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || box.w === 0 || box.h === 0) return;
    const z = fitCanvas(c, W, H, box.w, box.h, 24, frame);
    c.getObjects()
      .filter((o) => o.layerType === "pattern")
      .forEach((o) => o.set({ width: W, height: H, left: 0, top: 0 }));
    c.requestRenderAll();
    setZoomLocal(z);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, box.w, box.h, tick, frame.w, frame.h]);

  /* keyboard shortcuts for the active placement */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const c = canvasRef.current;
      if (!c) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const obj = c.getActiveObject();
      const editing = obj && "isEditing" in obj && (obj as { isEditing?: boolean }).isEditing;
      if (editing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        void undo();
      } else if ((mod && e.key.toLowerCase() === "y") || (mod && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        void redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && obj) {
        e.preventDefault();
        removeLayer(c, obj);
      } else if (mod && e.key.toLowerCase() === "d" && obj) {
        e.preventDefault();
        void duplicate(c, obj);
      } else if (obj && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        nudge(c, obj, e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, undo, redo]);

  // read through the registry (not the ref) so render stays pure; `tick` keeps it fresh
  const c = getCanvas(pid);
  const empty = !c || (listLayers(c).length === 0 && tick >= 0);
  const d = panelPath(placement.shape, W, H, placement.side);
  const cssW = Math.round(W * zoom);
  const cssH = Math.round(H * zoom);
  const frameW = Math.round(frame.w * zoom);
  const frameH = Math.round(frame.h * zoom);
  // Printful shows the blank product photo until the first layer is added
  const showBlankPhoto = empty && !dragOver && !!blankImage;

  const dropZone = (
    <button
      type="button"
      onClick={() => openPicker(pid)}
      className={`absolute left-1/2 top-1/2 flex h-60 w-60 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-full border-4 text-[15px] font-semibold text-[#1f5fa8] transition ${
        dragOver ? "border-[#1f5fa8] bg-[#cfe6fb]" : "border-[#e7edf3] bg-[#d9ecfa] hover:bg-[#cde5f8]"
      }`}
    >
      <UploadIcon className="h-5 w-5" />
      <span className="text-center leading-tight">
        Upload or drop
        <br />
        your design here
      </span>
    </button>
  );

  return (
    <div
      className={`${active ? "flex" : "hidden"} relative h-full w-full items-center justify-center`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) void importFiles(Array.from(e.dataTransfer.files), pid);
      }}
    >
      {/* blank product photo (shown on top while the placement is empty) */}
      {showBlankPhoto && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#fbfbfc]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={blankImage!} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
          {dropZone}
        </div>
      )}

      <div className="relative" style={{ width: frameW, height: frameH }}>
        {/* the print file canvas, positioned inside the template's print area */}
        <div className="absolute" style={{ left: Math.round(offX * zoom), top: Math.round(offY * zoom), width: cssW, height: cssH }}>
          <canvas ref={elRef} />
          {/* fallback guides (generated geometry) when no Printful template exists */}
          {!template && showGuides && (
            <svg className="pointer-events-none absolute inset-0" width={cssW} height={cssH} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              <path d={`M0 0 H${W} V${H} H0 Z ${d}`} fill="#ffffff" fillOpacity={0.62} fillRule="evenodd" />
              <path d={d} fill="none" stroke="#2b2b2b" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <path d={d} fill="none" stroke="#4b4b4b" strokeWidth={1} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" transform={safeAreaTransform(W, H, 0.9, PX_PER_INCH)} />
              <g fontSize={12 / zoom} fill="#444" fontFamily="system-ui, sans-serif">
                <line x1={W * 0.02} y1={H * 0.52} x2={W * 0.14} y2={H * 0.52} stroke="#444" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <text x={W * 0.02} y={H * 0.52 - 4 / zoom}>
                  Safe Print Area
                </text>
              </g>
            </svg>
          )}
          {(empty || dragOver) && !showBlankPhoto && dropZone}
        </div>
        {/* Printful design template overlay (transparent PNG with outline, safe area and labels) */}
        {template && showGuides && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={template.imageUrl} alt="" crossOrigin="anonymous" draggable={false} className="pointer-events-none absolute inset-0 select-none" style={{ width: frameW, height: frameH }} />
        )}
      </div>
      <button
        type="button"
        title={showGuides ? "Hide template guides" : "Show template guides"}
        onClick={() => setShowGuides((v) => !v)}
        className={`absolute right-3 top-3 z-20 rounded-md border bg-white p-2 shadow-sm hover:bg-gray-50 ${showGuides ? "border-gray-300 text-gray-800" : "border-gray-200 text-gray-400"}`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
