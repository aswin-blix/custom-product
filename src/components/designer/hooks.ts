"use client";
import { useCallback, useMemo } from "react";
import type { FabricObject } from "fabric";
import { useDesigner } from "@/store/designer";
import { getCanvas, listLayers, findLayer, isRestoring, snapshot, restore, exportPreview } from "@/lib/engine";

export function useActiveCanvas() {
  const pid = useDesigner((s) => s.activePlacement);
  const tick = useDesigner((s) => s.tick);
  return useMemo(() => getCanvas(pid), [pid, tick]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useLayers(): FabricObject[] {
  const c = useActiveCanvas();
  const tick = useDesigner((s) => s.tick);
  return useMemo(() => (c ? listLayers(c) : []), [c, tick]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useSelectedObject(): FabricObject | undefined {
  const c = useActiveCanvas();
  const id = useDesigner((s) => s.selectedId);
  const tick = useDesigner((s) => s.tick);
  return useMemo(() => (c && id ? findLayer(c, id) : undefined), [c, id, tick]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** push a snapshot of the active canvas into history (call after programmatic changes) */
export function useCommit() {
  const push = useDesigner((s) => s.pushHistory);
  const bump = useDesigner((s) => s.bump);
  return useCallback(
    (pid: string) => {
      const c = getCanvas(pid);
      if (!c || isRestoring(c)) return;
      push(pid, snapshot(c));
      bump();
    },
    [push, bump],
  );
}

export function useUndoRedo() {
  const pid = useDesigner((s) => s.activePlacement);
  const popUndo = useDesigner((s) => s.popUndo);
  const popRedo = useDesigner((s) => s.popRedo);
  const bump = useDesigner((s) => s.bump);
  const setSelected = useDesigner((s) => s.setSelected);
  const undo = useCallback(async () => {
    const c = getCanvas(pid);
    const snap = popUndo(pid);
    if (!c || !snap) return;
    await restore(c, snap);
    setSelected(null);
    bump();
  }, [pid, popUndo, bump, setSelected]);
  const redo = useCallback(async () => {
    const c = getCanvas(pid);
    const snap = popRedo(pid);
    if (!c || !snap) return;
    await restore(c, snap);
    setSelected(null);
    bump();
  }, [pid, popRedo, bump, setSelected]);
  return { undo, redo };
}

export function usePlacementPreviews() {
  const product = useDesigner((s) => s.product);
  const tick = useDesigner((s) => s.tick);
  return useMemo(() => {
    const out: Record<string, { dataUrl: string | null }> = {};
    product?.placements.forEach((p) => {
      const c = getCanvas(p.id);
      out[p.id] = { dataUrl: c ? exportPreview(c, 900) : null };
    });
    return out;
  }, [product, tick]); // eslint-disable-line react-hooks/exhaustive-deps
}
