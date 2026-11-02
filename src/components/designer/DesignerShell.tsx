"use client";
import { useEffect } from "react";
import { useDesigner } from "@/store/designer";
import type { ProductDef } from "@/lib/catalog";
import { TopBar, Rail, BottomBar, PlacementTabs, PanelToggle } from "./Chrome";
import CanvasViewport from "./CanvasViewport";
import MockupView from "./MockupView";
import { ContextToolbar, TransformTool, PositionTool, PatternTool, TextTool } from "./ContextTools";
import { IntroModal, StitchModal, CartModal } from "./Modals";
import { useSelectedObject } from "./hooks";
import ProductPanel from "./panels/ProductPanel";
import LayersPanel from "./panels/LayersPanel";
import UploadsPanel from "./panels/UploadsPanel";
import TextPanel from "./panels/TextPanel";
import ClipartPanel from "./panels/ClipartPanel";
import QuickDesignsPanel from "./panels/QuickDesignsPanel";
import PremiumPanel from "./panels/PremiumPanel";
import FillPanel from "./panels/FillPanel";

function SidePanel() {
  const tool = useDesigner((s) => s.tool);
  const ctx = useDesigner((s) => s.contextTool);
  const selected = useSelectedObject();
  if (selected && ctx) {
    if (ctx === "transform") return <TransformTool />;
    if (ctx === "position") return <PositionTool />;
    if (ctx === "pattern") return <PatternTool />;
    if (ctx === "text") return <TextTool />;
  }
  switch (tool) {
    case "product":
      return <ProductPanel />;
    case "layers":
      return <LayersPanel />;
    case "uploads":
      return <UploadsPanel />;
    case "text":
      return <TextPanel />;
    case "clipart":
      return <ClipartPanel />;
    case "quick":
      return <QuickDesignsPanel />;
    case "premium":
      return <PremiumPanel />;
    case "fill":
      return <FillPanel />;
  }
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  // dev aid: inspect designer state from the console
  (window as unknown as { __designer: typeof useDesigner }).__designer = useDesigner;
}

export default function DesignerShell({ product }: { product: ProductDef }) {
  const init = useDesigner((s) => s.init);
  const ready = useDesigner((s) => s.product?.slug === product.slug);
  const view = useDesigner((s) => s.view);
  const panelOpen = useDesigner((s) => s.panelOpen);

  useEffect(() => {
    init(product);
  }, [product, init]);

  if (!ready) return null;

  return (
    <div className="fixed inset-0 flex flex-col bg-white text-gray-900">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Rail />
        {view === "design" && (
          <>
            <aside className={`${panelOpen ? "w-[480px]" : "w-0"} shrink-0 overflow-y-auto border-r border-gray-200 bg-white transition-[width]`}>
              {panelOpen && <SidePanel />}
            </aside>
            <PanelToggle />
          </>
        )}
        <main className="flex min-w-0 flex-1 flex-col bg-[#f5f6f8]">
          {view === "design" ? (
            <>
              <PlacementTabs />
              <ContextToolbar />
              <CanvasViewport />
            </>
          ) : (
            <MockupView />
          )}
        </main>
      </div>
      <BottomBar />
      <IntroModal />
      <StitchModal />
      <CartModal />
    </div>
  );
}
