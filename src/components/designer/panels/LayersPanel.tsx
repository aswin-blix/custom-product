"use client";
import { useState } from "react";
import type { FabricObject } from "fabric";
import { Lock, Unlock, MoreVertical, ChevronUp, ChevronDown, Info, CornerDownRight } from "lucide-react";
import { useDesigner } from "@/store/designer";
import { useActiveCanvas, useLayers } from "../hooks";
import { layerInfo, toggleLock, duplicate, removeLayer, moveLayer } from "@/lib/engine";
import { qualityLabel } from "@/lib/quality";
import { swatchName } from "@/lib/palette";

const badge = (o: FabricObject) => {
  switch (o.layerType) {
    case "pattern":
      return { text: "Quick design", dark: true };
    case "text":
      return { text: "Text", dark: false };
    case "svg":
      return { text: "Clipart", dark: false };
    default:
      return { text: "Image", dark: false };
  }
};

function Badge({ text, dark }: { text: string; dark?: boolean }) {
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${dark ? "bg-[#3b3b3b] text-white" : "bg-gray-200 text-gray-800"}`}>{text}</span>;
}

function Dims({ w, h }: { w: number; h: number }) {
  return (
    <div className="mt-0.5 text-[12px] text-gray-700">
      <span className="font-semibold">Width:</span> {w.toFixed(2)}&quot; <span className="ml-1 font-semibold">Height:</span> {h.toFixed(2)}&quot;{" "}
      <Info className="ml-0.5 inline h-3 w-3 text-gray-400" />
    </div>
  );
}

function Thumb({ o }: { o: FabricObject }) {
  if (o.layerType === "text") {
    const t = o as unknown as { fontFamily?: string; fill?: string };
    return (
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded bg-gray-100 text-[18px] font-bold" style={{ fontFamily: t.fontFamily, color: typeof t.fill === "string" ? t.fill : "#111" }}>
        Aa
      </div>
    );
  }
  return (
    <div className="h-14 w-14 shrink-0 rounded bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#fff_0%_50%)] bg-[length:12px_12px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {o.thumb && <img src={o.thumb} alt="" className="h-full w-full object-contain" />}
    </div>
  );
}

function Row({ o, nested = false }: { o: FabricObject; nested?: boolean }) {
  const c = useActiveCanvas();
  const selectedId = useDesigner((s) => s.selectedId);
  const setContextTool = useDesigner((s) => s.setContextTool);
  const bump = useDesigner((s) => s.bump);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(true);
  const info = layerInfo(o);
  const q = qualityLabel(info.quality);
  const b = badge(o);
  const isPattern = o.layerType === "pattern";
  const selected = selectedId === o.layerId;

  const select = () => {
    if (!c) return;
    c.setActiveObject(o);
    c.requestRenderAll();
    setContextTool(isPattern ? "pattern" : "transform");
    bump();
  };

  return (
    <div className={nested ? "" : "border-b border-gray-200"}>
      <div
        onClick={select}
        className={`relative flex cursor-pointer items-start gap-3 px-3 py-3 ${selected ? "rounded-md ring-2 ring-gray-800" : "hover:bg-gray-50"} ${nested ? "ml-9" : ""}`}
      >
        {isPattern && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="mt-4 text-gray-500"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
        {nested && <CornerDownRight className="mt-4 h-4 w-4 text-gray-400" />}
        <Thumb o={o} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px]">
            <Badge text={b.text} dark={b.dark} />
            <span className="truncate text-gray-800">{o.layerName}</span>
          </div>
          {!isPattern && (
            <div className="mt-0.5 text-[12px]">
              <span className="font-semibold text-gray-700">Print quality:</span> <span className={`font-semibold ${q.color}`}>{q.text}</span>
              {info.dpi != null && <span className="ml-1 text-gray-400">({Math.round(info.dpi)} DPI)</span>}
            </div>
          )}
          <Dims w={isPattern ? (o.tileIn ?? 0) : info.widthIn} h={isPattern ? (o.tileIn ?? 0) * (o.naturalH && o.naturalW ? o.naturalH / o.naturalW : 1) : info.heightIn} />
        </div>
        {!nested && (
          <div className="flex items-center gap-1">
            <button
              title={o.layerLocked ? "Unlock layer" : "Lock layer"}
              onClick={(e) => {
                e.stopPropagation();
                if (c) toggleLock(c, o);
              }}
              className="rounded p-1 text-gray-600 hover:bg-gray-200"
            >
              {o.layerLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenu((v) => !v);
                }}
                className="rounded p-1 text-gray-600 hover:bg-gray-200"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menu && c && (
                <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-gray-200 bg-white py-1 text-[13px] shadow-lg" onClick={(e) => e.stopPropagation()}>
                  {[
                    { l: "Duplicate", f: () => void duplicate(c, o) },
                    { l: "Move up", f: () => moveLayer(c, o, "up"), hide: isPattern },
                    { l: "Move down", f: () => moveLayer(c, o, "down"), hide: isPattern },
                    { l: "Bring to front", f: () => moveLayer(c, o, "top"), hide: isPattern },
                    { l: "Send to back", f: () => moveLayer(c, o, "bottom"), hide: isPattern },
                    { l: "Delete", f: () => removeLayer(c, o), danger: true },
                  ]
                    .filter((m) => !m.hide)
                    .map((m) => (
                      <button
                        key={m.l}
                        onClick={() => {
                          m.f();
                          setMenu(false);
                        }}
                        className={`block w-full px-3 py-2 text-left hover:bg-gray-100 ${m.danger ? "text-red-600" : "text-gray-800"}`}
                      >
                        {m.l}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {isPattern && open && (
        <div className="pb-2">
          <div className="ml-9 flex items-start gap-3 px-3 py-2">
            <CornerDownRight className="mt-4 h-4 w-4 text-gray-400" />
            <Thumb o={o} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[13px]">
                <Badge text="Clipart" />
                <span className="truncate text-gray-800">{o.tileName}</span>
              </div>
              <div className="mt-0.5 text-[12px]">
                <span className="font-semibold text-gray-700">Print quality:</span> <span className="font-semibold text-green-700">Good / Vector</span>
              </div>
              <Dims w={o.tileIn ?? 0} h={o.tileIn ?? 0} />
            </div>
            <button
              title={o.layerLocked ? "Unlock" : "Lock"}
              onClick={(e) => {
                e.stopPropagation();
                if (c) toggleLock(c, o);
              }}
              className="rounded p-1 text-gray-600 hover:bg-gray-200"
            >
              {o.layerLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LayersPanel() {
  const layers = useLayers().filter((o) => o.quickDesignId !== "__bg__");
  const bgLayer = useLayers().find((o) => o.quickDesignId === "__bg__");
  const pid = useDesigner((s) => s.activePlacement);
  const bg = useDesigner((s) => s.bg[pid]);
  const setTool = useDesigner((s) => s.setTool);

  if (layers.length === 0 && !bg && !bgLayer) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <svg width="120" height="90" viewBox="0 0 120 90" className="mb-6">
          <rect x="22" y="10" width="86" height="60" rx="6" fill="#fff" stroke="#cfd4da" strokeWidth="2" />
          <rect x="22" y="10" width="86" height="12" rx="6" fill="#e9ecef" />
          <circle cx="30" cy="16" r="2" fill="#adb5bd" /><circle cx="37" cy="16" r="2" fill="#adb5bd" /><circle cx="44" cy="16" r="2" fill="#adb5bd" />
          <path d="M8 64 l26 -22 6 8 -26 22z" fill="#6c757d" />
          <rect x="18" y="72" width="70" height="8" rx="4" fill="#adb5bd" />
        </svg>
        <div className="text-[15px] font-semibold text-gray-900">Start designing</div>
        <div className="mt-1 text-[13px] text-gray-600">Your design layers will appear here.</div>
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      {layers.map((o) => (
        <Row key={o.layerId} o={o} />
      ))}
      {(bg || bgLayer) && (
        <div className="flex items-start gap-3 px-3 py-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#fff_0%_50%)] bg-[length:12px_12px]">
            <div className="absolute inset-3 rounded" style={{ background: bg ?? "#fff" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {bgLayer?.thumb && <img src={bgLayer.thumb} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />}
            <Lock className="absolute right-1 top-1 h-3 w-3 text-gray-700" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[13px]">
              <Badge text="Background fill" />
              <span className="truncate text-gray-800">{bgLayer ? bgLayer.tileName : swatchName(bg!)}</span>
            </div>
            <button onClick={() => setTool("fill")} className="mt-1 text-[13px] font-semibold text-[#1f5fa8] hover:underline">
              Change background fill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
