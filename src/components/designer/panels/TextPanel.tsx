"use client";
import { useState } from "react";
import { IText } from "fabric";
import { useDesigner } from "@/store/designer";
import { useActiveCanvas, useSelectedObject } from "../hooks";
import { addTextLayer, setTextProps } from "@/lib/engine";
import { FONT_COMBOS, QUOTES } from "@/lib/fonts";

export default function TextPanel() {
  const c = useActiveCanvas();
  const selected = useSelectedObject();
  const setContextTool = useDesigner((s) => s.setContextTool);
  const [draft, setDraft] = useState("");
  const [draftLayer, setDraftLayer] = useState<IText | null>(null);
  const [prevSelected, setPrevSelected] = useState<IText | null>(null);
  const selectedText = selected instanceof IText ? selected : null;

  // When the user selects a different text layer, mirror its content into the textarea.
  if (selectedText !== prevSelected) {
    setPrevSelected(selectedText);
    if (selectedText) {
      setDraftLayer(selectedText);
      setDraft(selectedText.text ?? "");
    }
  }

  const onChange = async (v: string) => {
    setDraft(v);
    if (!c) return;
    if (draftLayer && c.getObjects().includes(draftLayer)) {
      if (v.trim() === "") return;
      await setTextProps(c, draftLayer, { text: v });
    } else if (v.trim() !== "") {
      const t = (await addTextLayer(c, { text: v, fontFamily: "Montserrat", sizeIn: 1.2, fontWeight: "bold" })) as IText;
      setDraftLayer(t);
    }
  };

  const addCombo = async (lines: (typeof FONT_COMBOS)[number]["lines"]) => {
    if (!c) return;
    const total = lines.reduce((a, l) => a + l.size * 1.1, 0);
    let y = -total / 2;
    for (const l of lines) {
      y += (l.size * 1.1) / 2;
      await addTextLayer(c, { text: l.text, fontFamily: l.font, sizeIn: l.size, fontWeight: l.weight, offsetIn: y });
      y += (l.size * 1.1) / 2;
    }
    setDraftLayer(null);
    setContextTool("text");
  };

  return (
    <div className="px-5 py-5">
      <textarea
        value={draft}
        onChange={(e) => void onChange(e.target.value)}
        placeholder="Type your text here"
        className="h-28 w-full resize-y rounded-md border border-gray-300 p-3 text-[14px] outline-none focus:border-gray-700"
      />
      <div className="mt-1 text-[11px] text-gray-500">Text appears on the canvas as you type. Select a text layer to edit it here.</div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-gray-900">Font combinations</div>
        <a href="#more" className="text-[12px] text-[#1f5fa8] hover:underline">
          See more
        </a>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {FONT_COMBOS.map((combo) => (
          <button key={combo.id} onClick={() => void addCombo(combo.lines)} className="flex aspect-square flex-col items-center justify-center rounded-md border border-gray-200 bg-white p-2 hover:border-gray-500">
            {combo.lines.map((l, i) => (
              <span key={i} className="leading-none" style={{ fontFamily: `"${l.font}", sans-serif`, fontSize: `${Math.min(26, 9 + l.size * 6)}px`, fontWeight: l.weight ?? 400 }}>
                {l.text}
              </span>
            ))}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-gray-900">Ready to use quotes</div>
        <a href="#more" className="text-[12px] text-[#1f5fa8] hover:underline">
          See more
        </a>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {QUOTES.map((q, i) => (
          <button
            key={q}
            onClick={() => void addCombo([{ text: q, font: FONT_COMBOS[i % FONT_COMBOS.length].lines[0].font, size: 1.4 }])}
            className="flex aspect-square items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-center text-[13px] leading-tight hover:border-gray-500"
            style={{ fontFamily: `"${FONT_COMBOS[i % FONT_COMBOS.length].lines[0].font}", sans-serif` }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
