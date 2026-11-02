"use client";
import Link from "next/link";
import { Undo2, Redo2, X, ShoppingCart, Info, Shirt, Layers, Upload, Type, Smile, Wand2, Crown, PaintBucket, ChevronLeft, ChevronRight } from "lucide-react";
import { useDesigner, canRedo, canUndo, type Tool } from "@/store/designer";
import { formatPrice, priceFor } from "@/lib/catalog";
import { useUndoRedo } from "./hooks";
import { allCanvases, hasDesign } from "@/lib/engine";

export function TopBar() {
  const product = useDesigner((s) => s.product)!;
  const view = useDesigner((s) => s.view);
  const setView = useDesigner((s) => s.setView);
  const stitch = useDesigner((s) => s.stitch);
  const setStitchModal = useDesigner((s) => s.setStitchModal);
  const tick = useDesigner((s) => s.tick);
  const undoable = useDesigner(canUndo);
  const redoable = useDesigner(canRedo);
  const { undo, redo } = useUndoRedo();
  const designed = allCanvases().some(([, c]) => hasDesign(c));
  void tick;

  const goMockups = () => {
    if (product.stitchColors && !stitch) setStitchModal(true);
    else setView("mockups");
  };

  return (
    <header className="flex h-16 items-center border-b border-gray-200 bg-white px-5">
      <div className="truncate text-[15px] font-semibold text-gray-900">{product.name}</div>
      <div className="ml-auto flex items-center gap-1">
        <button onClick={() => void undo()} disabled={!undoable} className="rounded p-2 text-gray-700 disabled:text-gray-300 hover:bg-gray-100 disabled:hover:bg-transparent" title="Undo (Ctrl+Z)">
          <Undo2 className="h-5 w-5" />
        </button>
        <button onClick={() => void redo()} disabled={!redoable} className="rounded p-2 text-gray-700 disabled:text-gray-300 hover:bg-gray-100 disabled:hover:bg-transparent" title="Redo (Ctrl+Y)">
          <Redo2 className="h-5 w-5" />
        </button>
        {designed && (
          <div className="ml-3 flex rounded-md border border-gray-300 p-0.5 text-[14px] font-semibold">
            <button onClick={() => setView("design")} className={`rounded px-4 py-1.5 ${view === "design" ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-300" : "text-gray-600"}`}>
              Design
            </button>
            <button onClick={goMockups} className={`rounded px-4 py-1.5 ${view === "mockups" ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-300" : "text-gray-600"}`}>
              Mockups
            </button>
          </div>
        )}
        <div className="mx-3 h-7 w-px bg-gray-200" />
        <Link href={`/custom/${product.slug}`} className="rounded p-2 text-gray-500 hover:bg-gray-100" title="Close designer">
          <X className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}

const TOOLS: { id: Tool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "product", label: "Product", icon: Shirt },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "uploads", label: "Uploads", icon: Upload },
  { id: "text", label: "Text", icon: Type },
  { id: "clipart", label: "Clipart", icon: Smile },
  { id: "quick", label: "Quick Designs", icon: Wand2 },
  { id: "premium", label: "Premium", icon: Crown },
  { id: "fill", label: "Fill", icon: PaintBucket },
];

export function Rail() {
  const tool = useDesigner((s) => s.tool);
  const setTool = useDesigner((s) => s.setTool);
  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-gray-200 bg-white py-2">
      {TOOLS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTool(id)}
          className={`flex w-[58px] flex-col items-center gap-1 rounded-md px-1 py-2.5 text-[11px] leading-tight ${
            tool === id ? "bg-[#3b3b3b] text-white" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Icon className="h-5 w-5" />
          <span className="text-center">{label}</span>
        </button>
      ))}
      <div className="mt-auto pb-2 text-center text-[11px] text-gray-500">
        <div className="font-bold text-gray-800">fiverr.</div>
        <div className="text-[#1f5fa8]">Hire designer</div>
      </div>
    </nav>
  );
}

export function PanelToggle() {
  const open = useDesigner((s) => s.panelOpen);
  const setOpen = useDesigner((s) => s.setPanelOpen);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="z-10 -ml-px flex h-10 w-4 items-center justify-center self-center rounded-r-md border border-l-0 border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
      title={open ? "Collapse panel" : "Expand panel"}
    >
      {open ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
    </button>
  );
}

export function BottomBar() {
  const product = useDesigner((s) => s.product)!;
  const size = useDesigner((s) => s.size);
  const color = useDesigner((s) => s.color);
  const tick = useDesigner((s) => s.tick);
  const setCartModal = useDesigner((s) => s.setCartModal);
  const designed = allCanvases().some(([, c]) => hasDesign(c));
  void tick;
  return (
    <footer className="flex h-16 items-center justify-end gap-3 border-t border-gray-200 bg-white px-6">
      <div className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2.5 text-[15px] font-bold text-gray-900">
        <ShoppingCart className="h-4 w-4 text-gray-500" />
        {formatPrice(priceFor(product, size, color))}
        <Info className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <button
        disabled={!designed}
        onClick={() => setCartModal(true)}
        className="rounded-md bg-[#e5322d] px-6 py-2.5 text-[15px] font-semibold text-white transition disabled:bg-[#f3a7a5] hover:enabled:bg-[#c92a26]"
      >
        Add to cart
      </button>
    </footer>
  );
}

export function PlacementTabs() {
  const product = useDesigner((s) => s.product)!;
  const active = useDesigner((s) => s.activePlacement);
  const setPlacement = useDesigner((s) => s.setPlacement);
  return (
    <div className="flex items-center gap-1 px-6 pb-2 pt-5">
      {product.placements.map((p) => (
        <button
          key={p.id}
          onClick={() => setPlacement(p.id)}
          className={`rounded-full px-4 py-1.5 text-[15px] font-semibold ${active === p.id ? "bg-[#d9ecfa] text-[#1f5fa8]" : "text-gray-800 hover:bg-gray-100"}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
