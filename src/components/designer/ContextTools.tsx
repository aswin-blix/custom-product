"use client";
import { useState } from "react";
import { IText } from "fabric";
import { ChevronLeft, Link2, Link2Off, Minus, Plus, FlipHorizontal2, FlipVertical2, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter, AlignStartVertical, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal, Scan, Move, Grid3X3, Type } from "lucide-react";
import { useDesigner, type ContextTool } from "@/store/designer";
import { useActiveCanvas, useSelectedObject } from "./hooks";
import { layerInfo, setLayerSize, setRotation, flip, align, convertToPattern, convertToSingle, updatePatternLayer, setTextProps, type Align } from "@/lib/engine";
import { TILE_MODES } from "@/lib/pattern";
import { FONT_FAMILIES } from "@/lib/fonts";
import { PALETTE } from "@/lib/palette";
import { PX_PER_INCH } from "@/lib/catalog";

/* ------------------------------------------------------------------ */
/* toolbar above the canvas                                            */
/* ------------------------------------------------------------------ */

export function ContextToolbar() {
  const obj = useSelectedObject();
  const tool = useDesigner((s) => s.contextTool);
  const setTool = useDesigner((s) => s.setContextTool);
  if (!obj) return null;
  const isPattern = obj.layerType === "pattern";
  const isText = obj instanceof IText;
  const tabs: { id: ContextTool; label: string; icon: React.ComponentType<{ className?: string }> }[] = isPattern
    ? [{ id: "pattern", label: "Pattern", icon: Grid3X3 }]
    : [
        { id: "transform", label: "Transform", icon: Scan },
        { id: "position", label: "Position", icon: Move },
        ...(isText ? [{ id: "text" as ContextTool, label: "Text", icon: Type }] : [{ id: "pattern" as ContextTool, label: "Pattern", icon: Grid3X3 }]),
      ];
  return (
    <div className="mx-6 mb-3 flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-2">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button key={id} onClick={() => setTool(tool === id ? null : id)} className={`flex items-center gap-2 rounded px-3 py-1.5 text-[13px] font-semibold ${tool === id ? "bg-[#d9ecfa] text-[#1f5fa8]" : "text-gray-800 hover:bg-gray-100"}`}>
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* side-panel editors                                                  */
/* ------------------------------------------------------------------ */

function Header() {
  const setTool = useDesigner((s) => s.setContextTool);
  const setRail = useDesigner((s) => s.setTool);
  return (
    <button
      onClick={() => {
        setTool(null);
        setRail("layers");
      }}
      className="flex items-center gap-1 text-[13px] text-[#1f5fa8] hover:underline"
    >
      <ChevronLeft className="h-4 w-4" /> See all design layers
    </button>
  );
}

function Stepper({ label, value, onChange, step = 0.1, min = 0.1 }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  // `text` is only set while the user is typing; otherwise we show the live value.
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? value.toFixed(2);
  const commit = (v: number) => {
    setText(null);
    if (!Number.isFinite(v) || v < min) return;
    onChange(Number(v.toFixed(2)));
  };
  return (
    <div>
      <div className="mb-1 text-[12px] font-semibold text-gray-700">{label}</div>
      <div className="flex items-center rounded-md border border-gray-300">
        <button onClick={() => commit(value - step)} className="px-2 py-2 text-gray-600 hover:bg-gray-100">
          <Minus className="h-4 w-4" />
        </button>
        <input value={shown} onChange={(e) => setText(e.target.value)} onBlur={() => commit(parseFloat(shown))} onKeyDown={(e) => e.key === "Enter" && commit(parseFloat(shown))} className="w-full border-x border-gray-300 py-2 text-center text-[13px] outline-none" />
        <button onClick={() => commit(value + step)} className="px-2 py-2 text-gray-600 hover:bg-gray-100">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function TransformTool() {
  const c = useActiveCanvas();
  const obj = useSelectedObject();
  const [linked, setLinked] = useState(true);
  if (!c || !obj) return null;
  const info = layerInfo(obj);
  const angle = Math.round(((obj.angle % 360) + 540) % 360) - 180;
  return (
    <div className="px-5 py-4">
      <Header />
      <div className="mt-5 text-[12px] font-semibold text-gray-700">Rotate</div>
      <div className="mt-2 flex items-center gap-3">
        <input type="range" min={-180} max={180} value={angle} onChange={(e) => setRotation(c, obj, Number(e.target.value))} className="w-full accent-gray-800" />
        <input type="number" value={angle} onChange={(e) => setRotation(c, obj, Number(e.target.value))} className="w-20 rounded-md border border-gray-300 py-1.5 text-center text-[13px]" />
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Stepper label="Width" value={info.widthIn} onChange={(v) => setLayerSize(c, obj, v, undefined, linked)} />
        <button onClick={() => setLinked((v) => !v)} title={linked ? "Unlink proportions" : "Link proportions"} className="mb-2 rounded p-1 text-gray-600 hover:bg-gray-100">
          {linked ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
        </button>
        <Stepper label="Height" value={info.heightIn} onChange={(v) => setLayerSize(c, obj, undefined, v, linked)} />
      </div>
      <div className="mt-5 text-[12px] font-semibold text-gray-700">Flip</div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <button onClick={() => flip(c, obj, "x")} className="flex items-center justify-center gap-2 rounded-md border border-gray-300 py-2 text-[13px] font-semibold hover:border-gray-600">
          <FlipHorizontal2 className="h-4 w-4" /> Horizontally
        </button>
        <button onClick={() => flip(c, obj, "y")} className="flex items-center justify-center gap-2 rounded-md border border-gray-300 py-2 text-[13px] font-semibold hover:border-gray-600">
          <FlipVertical2 className="h-4 w-4" /> Vertically
        </button>
      </div>
    </div>
  );
}

export function PositionTool() {
  const c = useActiveCanvas();
  const obj = useSelectedObject();
  if (!c || !obj) return null;
  const btns: { a: Align; icon: React.ComponentType<{ className?: string }>; t: string }[] = [
    { a: "vcenter", icon: AlignVerticalJustifyCenter, t: "Center vertically" },
    { a: "hcenter", icon: AlignHorizontalJustifyCenter, t: "Center horizontally" },
    { a: "left", icon: AlignStartVertical, t: "Align left" },
    { a: "right", icon: AlignEndVertical, t: "Align right" },
    { a: "top", icon: AlignStartHorizontal, t: "Align top" },
    { a: "bottom", icon: AlignEndHorizontal, t: "Align bottom" },
  ];
  return (
    <div className="px-5 py-4">
      <Header />
      <div className="mt-5 text-[12px] font-semibold text-gray-700">Align</div>
      <div className="mt-2 flex gap-2">
        {btns.map(({ a, icon: Icon, t }) => (
          <button key={a} title={t} onClick={() => align(c, obj, a)} className="rounded-md border border-gray-300 p-2 hover:border-gray-700">
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function PatternTool() {
  const c = useActiveCanvas();
  const obj = useSelectedObject();
  const setSelected = useDesigner((s) => s.setSelected);
  const setContextTool = useDesigner((s) => s.setContextTool);
  if (!c || !obj) return null;
  const isPattern = obj.layerType === "pattern";
  const current = isPattern ? obj.tileMode : "none";

  const choose = async (mode: (typeof TILE_MODES)[number]["id"]) => {
    if (mode === "none") {
      if (isPattern) {
        const single = await convertToSingle(c, obj);
        setSelected(single?.layerId ?? null);
        setContextTool("transform");
      }
      return;
    }
    if (isPattern) await updatePatternLayer(c, obj, { mode });
    else {
      const rect = await convertToPattern(c, obj, mode);
      setSelected(rect?.layerId ?? null);
    }
  };

  const Preview = ({ id }: { id: string }) => {
    const cell = (x: number, y: number, fx = false) => <text key={`${x}${y}`} x={x} y={y} fontSize="9" fontWeight="700" transform={fx ? `scale(-1 1) translate(${-2 * x} 0)` : undefined}>P</text>;
    const grids: Record<string, React.ReactNode> = {
      none: <path d="M4 4 L20 20 M20 4 L4 20" stroke="currentColor" strokeWidth="1.5" />,
      grid: [cell(5, 11), cell(14, 11), cell(5, 20), cell(14, 20)],
      "half-drop": [cell(5, 11), cell(14, 15), cell(5, 20), cell(14, 24)],
      "half-brick": [cell(5, 11), cell(14, 11), cell(9, 20), cell(18, 20)],
      mirror: [cell(5, 11), cell(14, 11, true), cell(5, 20), cell(14, 20, true)],
      row: [cell(2, 15), cell(9, 15), cell(16, 15)],
      column: [cell(9, 8), cell(9, 16), cell(9, 24)],
    };
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" className="fill-current">
        {grids[id]}
      </svg>
    );
  };

  return (
    <div className="px-5 py-4">
      <Header />
      <div className="mt-5 text-[12px] font-semibold text-gray-700">Pattern type</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {TILE_MODES.map((m) => (
          <button key={m.id} title={m.label} onClick={() => void choose(m.id)} className={`rounded-md border p-1.5 ${current === m.id ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-300 hover:border-gray-700"}`}>
            <Preview id={m.id} />
          </button>
        ))}
      </div>
      {isPattern && (
        <>
          <div className="mt-6 text-[12px] font-semibold text-gray-700">Tile size ({(obj.tileIn ?? 2).toFixed(1)}&quot;)</div>
          <input type="range" min={0.5} max={12} step={0.1} value={obj.tileIn ?? 2} onChange={(e) => void updatePatternLayer(c, obj, { tileIn: Number(e.target.value) })} className="mt-2 w-full accent-gray-800" />
          <div className="mt-4 text-[12px] font-semibold text-gray-700">Spacing ({Math.round((obj.tileGap ?? 0) * 100)}%)</div>
          <input type="range" min={0} max={1} step={0.05} value={obj.tileGap ?? 0} onChange={(e) => void updatePatternLayer(c, obj, { gap: Number(e.target.value) })} className="mt-2 w-full accent-gray-800" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[12px] font-semibold text-gray-700">Offset X</div>
              <input type="range" min={-6} max={6} step={0.1} value={obj.tileOffsetX ?? 0} onChange={(e) => void updatePatternLayer(c, obj, { offsetX: Number(e.target.value) })} className="mt-2 w-full accent-gray-800" />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-gray-700">Offset Y</div>
              <input type="range" min={-6} max={6} step={0.1} value={obj.tileOffsetY ?? 0} onChange={(e) => void updatePatternLayer(c, obj, { offsetY: Number(e.target.value) })} className="mt-2 w-full accent-gray-800" />
            </div>
          </div>
        </>
      )}
      {!isPattern && <div className="mt-4 text-[12px] text-gray-500">Pick a pattern type to repeat this layer across the whole placement.</div>}
    </div>
  );
}

export function TextTool() {
  const c = useActiveCanvas();
  const obj = useSelectedObject();
  const tick = useDesigner((s) => s.tick);
  void tick;
  if (!c || !(obj instanceof IText)) return null;
  const t = obj;
  const sizeIn = t.fontSize / PX_PER_INCH;
  const fill = typeof t.fill === "string" ? t.fill : "#111111";
  const strokeOn = !!t.stroke && (t.strokeWidth ?? 0) > 0;
  return (
    <div className="px-5 py-4">
      <Header />
      <textarea value={t.text} onChange={(e) => void setTextProps(c, t, { text: e.target.value })} className="mt-4 h-20 w-full resize-y rounded-md border border-gray-300 p-2 text-[14px] outline-none focus:border-gray-700" />
      <div className="mt-4 text-[12px] font-semibold text-gray-700">Font</div>
      <select value={t.fontFamily} onChange={(e) => void setTextProps(c, t, { fontFamily: e.target.value })} className="mt-1 w-full rounded-md border border-gray-300 p-2 text-[13px]" style={{ fontFamily: t.fontFamily }}>
        {FONT_FAMILIES.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </select>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stepper label="Size (in)" value={sizeIn} onChange={(v) => void setTextProps(c, t, { fontSize: v * PX_PER_INCH })} step={0.1} />
        <div>
          <div className="mb-1 text-[12px] font-semibold text-gray-700">Letter spacing</div>
          <input type="range" min={-100} max={800} value={t.charSpacing ?? 0} onChange={(e) => void setTextProps(c, t, { charSpacing: Number(e.target.value) })} className="w-full accent-gray-800" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {(["left", "center", "right"] as const).map((a) => (
          <button key={a} onClick={() => void setTextProps(c, t, { textAlign: a })} className={`rounded-md border px-3 py-1.5 text-[12px] font-semibold capitalize ${t.textAlign === a ? "border-gray-900" : "border-gray-300"}`}>
            {a}
          </button>
        ))}
        <button onClick={() => void setTextProps(c, t, { fontWeight: t.fontWeight === "bold" ? "normal" : "bold" })} className={`rounded-md border px-3 py-1.5 text-[12px] font-bold ${t.fontWeight === "bold" ? "border-gray-900" : "border-gray-300"}`}>
          B
        </button>
        <button onClick={() => void setTextProps(c, t, { fontStyle: t.fontStyle === "italic" ? "normal" : "italic" })} className={`rounded-md border px-3 py-1.5 text-[12px] italic ${t.fontStyle === "italic" ? "border-gray-900" : "border-gray-300"}`}>
          I
        </button>
      </div>
      <div className="mt-4 text-[12px] font-semibold text-gray-700">Color</div>
      <div className="mt-2 grid grid-cols-9 gap-1">
        <label className="relative h-8 w-8 cursor-pointer rounded border border-gray-300" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}>
          <input type="color" value={fill} onChange={(e) => void setTextProps(c, t, { fill: e.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
        {PALETTE.map((s) => (
          <button key={s.hex} title={s.name} onClick={() => void setTextProps(c, t, { fill: s.hex })} className={`h-8 w-8 rounded border ${fill.toLowerCase() === s.hex ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"}`} style={{ background: s.hex }} />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={strokeOn} onChange={(e) => void setTextProps(c, t, { stroke: e.target.checked ? "#ffffff" : null, strokeWidth: e.target.checked ? 2 : 0 })} className="accent-[#1f5fa8]" />
          Outline
        </label>
        {strokeOn && (
          <div className="flex items-center gap-2">
            <input type="color" value={typeof t.stroke === "string" ? t.stroke : "#ffffff"} onChange={(e) => void setTextProps(c, t, { stroke: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-gray-300" />
            <input type="range" min={1} max={12} value={t.strokeWidth ?? 2} onChange={(e) => void setTextProps(c, t, { strokeWidth: Number(e.target.value) })} className="w-24 accent-gray-800" />
          </div>
        )}
      </div>
    </div>
  );
}
