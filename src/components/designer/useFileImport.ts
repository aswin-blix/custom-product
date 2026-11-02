"use client";
import { useCallback } from "react";
import { useDesigner, type Upload } from "@/store/designer";
import { addImageLayer, addSvgLayer, getCanvas, nextId } from "@/lib/engine";

const readAsDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });

const readAsText = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsText(f);
  });

const imageSize = (url: string) =>
  new Promise<{ w: number; h: number }>((res) => {
    const i = new Image();
    i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight });
    i.onerror = () => res({ w: 0, h: 0 });
    i.src = url;
  });

export function useFileImport() {
  const addUpload = useDesigner((s) => s.addUpload);
  const setTool = useDesigner((s) => s.setTool);

  const registerFile = useCallback(
    async (file: File): Promise<Upload | null> => {
      const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
      if (!isSvg && !file.type.startsWith("image/")) return null;
      if (isSvg) {
        const svg = await readAsText(file);
        const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        const { w, h } = await imageSize(url);
        const u: Upload = { id: nextId(), name: file.name, url, kind: "svg", width: w, height: h, size: file.size };
        addUpload(u);
        return u;
      }
      const url = await readAsDataUrl(file);
      const { w, h } = await imageSize(url);
      const u: Upload = { id: nextId(), name: file.name, url, kind: "raster", width: w, height: h, size: file.size };
      addUpload(u);
      return u;
    },
    [addUpload],
  );

  const placeUpload = useCallback(async (u: Upload, pid: string) => {
    const c = getCanvas(pid);
    if (!c) return;
    if (u.kind === "svg") {
      const svg = decodeURIComponent(u.url.split(",")[1]);
      await addSvgLayer(c, svg, u.name);
    } else {
      await addImageLayer(c, u.url, u.name);
    }
  }, []);

  const importFiles = useCallback(
    async (files: File[], pid: string) => {
      for (const f of files) {
        const u = await registerFile(f);
        if (u) await placeUpload(u, pid);
      }
      setTool("layers");
    },
    [registerFile, placeUpload, setTool],
  );

  const openPicker = useCallback(
    (pid: string, placeOnCanvas = true) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
      input.multiple = true;
      input.onchange = async () => {
        const files = Array.from(input.files ?? []);
        if (placeOnCanvas) await importFiles(files, pid);
        else for (const f of files) await registerFile(f);
      };
      input.click();
    },
    [importFiles, registerFile],
  );

  return { importFiles, openPicker, placeUpload, registerFile };
}
