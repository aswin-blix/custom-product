"use client";
import { useState } from "react";
import { Upload as UploadIcon, Trash2 } from "lucide-react";
import { useDesigner } from "@/store/designer";
import { useFileImport } from "../useFileImport";

const fmt = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export default function UploadsPanel() {
  const uploads = useDesigner((s) => s.uploads);
  const removeUpload = useDesigner((s) => s.removeUpload);
  const pid = useDesigner((s) => s.activePlacement);
  const setTool = useDesigner((s) => s.setTool);
  const { openPicker, placeUpload, importFiles } = useFileImport();
  const [over, setOver] = useState(false);

  return (
    <div className="px-5 py-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void importFiles(Array.from(e.dataTransfer.files), pid);
        }}
        className={`rounded-lg border-2 border-dashed p-6 text-center ${over ? "border-[#1f5fa8] bg-[#eaf4fd]" : "border-gray-300"}`}
      >
        <UploadIcon className="mx-auto h-6 w-6 text-gray-500" />
        <div className="mt-2 text-[14px] font-semibold text-gray-900">Drag &amp; drop files here</div>
        <div className="mt-1 text-[12px] text-gray-500">PNG, JPG, WEBP, GIF or SVG · max 200 MB · 150 DPI recommended</div>
        <button onClick={() => openPicker(pid)} className="mt-4 rounded-md bg-[#1f5fa8] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#184b85]">
          Upload file
        </button>
      </div>

      <div className="mt-6 text-[12px] font-semibold text-gray-700">Your uploads</div>
      {uploads.length === 0 ? (
        <div className="mt-2 text-[13px] text-gray-500">Files you upload will appear here so you can reuse them on every placement.</div>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {uploads.map((u) => (
            <li key={u.id} className="group relative">
              <button
                onClick={async () => {
                  await placeUpload(u, pid);
                  setTool("layers");
                }}
                className="block w-full overflow-hidden rounded-md border border-gray-200 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#fff_0%_50%)] bg-[length:12px_12px] hover:border-gray-500"
                title={`Add ${u.name} to ${pid}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.url} alt={u.name} className="aspect-square w-full object-contain" />
              </button>
              <div className="mt-1 truncate text-[11px] text-gray-700">{u.name}</div>
              <div className="text-[10px] text-gray-400">
                {u.kind === "svg" ? "Vector" : `${u.width}×${u.height}`} · {fmt(u.size)}
              </div>
              <button onClick={() => removeUpload(u.id)} className="absolute right-1 top-1 hidden rounded bg-white/90 p-1 text-red-600 shadow group-hover:block" title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
