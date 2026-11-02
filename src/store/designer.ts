"use client";
import { create } from "zustand";
import { placementDims, type ProductDef } from "@/lib/catalog";

export type Tool = "product" | "layers" | "uploads" | "text" | "clipart" | "quick" | "premium" | "fill";
export type ContextTool = "transform" | "position" | "pattern" | "text" | null;
export type View = "design" | "mockups";
export type Stitch = "White" | "Black";

export interface Upload {
  id: string;
  name: string;
  url: string;
  kind: "raster" | "svg";
  width: number;
  height: number;
  size: number;
}

interface History {
  undo: string[];
  redo: string[];
}

export interface DesignerState {
  product: ProductDef | null;
  size: string;
  color: string;
  stitch: Stitch | null;
  activePlacement: string;
  tool: Tool;
  contextTool: ContextTool;
  view: View;
  selectedId: string | null;
  /** bumps whenever any canvas changes so derived UI re-reads Fabric state */
  tick: number;
  bg: Record<string, string | null>;
  applyBgAll: boolean;
  history: Record<string, History>;
  uploads: Upload[];
  stitchModal: boolean;
  cartModal: boolean;
  introSeen: boolean;
  panelOpen: boolean;
  zoom: number;

  init: (product: ProductDef) => void;
  setSize: (s: string) => void;
  setColor: (c: string) => void;
  setStitch: (s: Stitch | null) => void;
  setPlacement: (id: string) => void;
  setTool: (t: Tool) => void;
  setContextTool: (t: ContextTool) => void;
  setView: (v: View) => void;
  setSelected: (id: string | null) => void;
  bump: () => void;
  setBg: (pid: string, color: string | null) => void;
  setApplyBgAll: (v: boolean) => void;
  pushHistory: (pid: string, snap: string) => void;
  popUndo: (pid: string) => string | null;
  popRedo: (pid: string) => string | null;
  addUpload: (u: Upload) => void;
  removeUpload: (id: string) => void;
  setStitchModal: (v: boolean) => void;
  setCartModal: (v: boolean) => void;
  setIntroSeen: (v: boolean) => void;
  setPanelOpen: (v: boolean) => void;
  setZoom: (z: number) => void;
  dims: (pid?: string) => { widthIn: number; heightIn: number };
}

const HISTORY_CAP = 40;

export const useDesigner = create<DesignerState>((set, get) => ({
  product: null,
  size: "",
  color: "",
  stitch: null,
  activePlacement: "front",
  tool: "product",
  contextTool: null,
  view: "design",
  selectedId: null,
  tick: 0,
  bg: {},
  applyBgAll: true,
  history: {},
  uploads: [],
  stitchModal: false,
  cartModal: false,
  introSeen: false,
  panelOpen: true,
  zoom: 1,

  init: (product) =>
    set({
      product,
      size: product.sizes[0],
      color: product.colors?.[0]?.name ?? "",
      stitch: null,
      activePlacement: product.placements[0].id,
      tool: "product",
      contextTool: null,
      view: "design",
      selectedId: null,
      bg: Object.fromEntries(product.placements.map((p) => [p.id, null])),
      history: Object.fromEntries(product.placements.map((p) => [p.id, { undo: [], redo: [] }])),
      applyBgAll: true,
      introSeen: false,
      tick: 0,
    }),
  setSize: (size) => set({ size }),
  setColor: (color) => set({ color }),
  setStitch: (stitch) => set({ stitch }),
  setPlacement: (activePlacement) => set({ activePlacement, selectedId: null, contextTool: null }),
  setTool: (tool) => set({ tool, panelOpen: true }),
  setContextTool: (contextTool) => set({ contextTool }),
  setView: (view) => set({ view }),
  setSelected: (selectedId) => set({ selectedId, contextTool: selectedId ? get().contextTool : null }),
  bump: () => set((s) => ({ tick: s.tick + 1 })),
  setBg: (pid, color) => set((s) => ({ bg: { ...s.bg, [pid]: color } })),
  setApplyBgAll: (applyBgAll) => set({ applyBgAll }),
  pushHistory: (pid, snap) =>
    set((s) => {
      const h = s.history[pid] ?? { undo: [], redo: [] };
      if (h.undo[h.undo.length - 1] === snap) return {};
      const undo = [...h.undo, snap].slice(-HISTORY_CAP);
      return { history: { ...s.history, [pid]: { undo, redo: [] } } };
    }),
  popUndo: (pid) => {
    const h = get().history[pid];
    if (!h || h.undo.length < 2) return null;
    const undo = h.undo.slice();
    const current = undo.pop()!;
    const prev = undo[undo.length - 1];
    set((s) => ({ history: { ...s.history, [pid]: { undo, redo: [...h.redo, current] } } }));
    return prev;
  },
  popRedo: (pid) => {
    const h = get().history[pid];
    if (!h || h.redo.length === 0) return null;
    const redo = h.redo.slice();
    const next = redo.pop()!;
    set((s) => ({ history: { ...s.history, [pid]: { undo: [...h.undo, next], redo } } }));
    return next;
  },
  addUpload: (u) => set((s) => ({ uploads: [u, ...s.uploads] })),
  removeUpload: (id) => set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) })),
  setStitchModal: (stitchModal) => set({ stitchModal }),
  setCartModal: (cartModal) => set({ cartModal }),
  setIntroSeen: (introSeen) => set({ introSeen }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setZoom: (zoom) => set({ zoom }),
  dims: (pid) => {
    const { product, size, activePlacement } = get();
    if (!product) return { widthIn: 10, heightIn: 10 };
    const placement = product.placements.find((p) => p.id === (pid ?? activePlacement)) ?? product.placements[0];
    return placementDims(product, placement, size);
  },
}));

export const canUndo = (s: DesignerState) => (s.history[s.activePlacement]?.undo.length ?? 0) > 1;
export const canRedo = (s: DesignerState) => (s.history[s.activePlacement]?.redo.length ?? 0) > 0;
