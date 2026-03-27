"use client";
import { useRef, useEffect, useCallback } from "react";
import type { ContentBlock, TextBlockContent } from "@/types";

interface Props {
  block: ContentBlock;
  onUpdate: (id: string, content: Record<string, unknown>) => void;
}

export default function TextBlockEditor({ block, onUpdate }: Props) {
  const content = block.content as TextBlockContent;
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockId = block.id;

  // Set initial HTML once on mount — never touch it again via React
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content.html;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (editorRef.current) {
        onUpdate(blockId, { html: editorRef.current.innerHTML });
      }
    }, 600);
  }, [blockId, onUpdate]);

  function execCmd(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value ?? undefined);
    scheduleSave();
  }

  const toolbar = [
    { cmd: "bold",                label: "B",  cls: "font-bold" },
    { cmd: "italic",              label: "I",  cls: "italic" },
    { cmd: "underline",           label: "U",  cls: "underline" },
    { cmd: "insertUnorderedList", label: "• List", cls: "" },
    { cmd: "insertOrderedList",   label: "1. List", cls: "" },
    { cmd: "formatBlock",         label: "H2", cls: "font-bold", value: "h2" },
    { cmd: "formatBlock",         label: "H3", cls: "font-bold", value: "h3" },
    { cmd: "formatBlock",         label: "¶",  cls: "",          value: "p" },
  ];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-1 pb-2.5"
        style={{ borderBottom: "1px solid #1a1a1a" }}
      >
        {toolbar.map((btn) => (
          <button
            key={btn.cmd + (btn.value ?? btn.label)}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault(); // prevent blur on the editor
              execCmd(btn.cmd, btn.value);
            }}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors hover:bg-white/10 ${btn.cls}`}
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Editor — React never touches innerHTML after mount */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={scheduleSave}
        className="min-h-[140px] text-sm leading-relaxed outline-none"
        style={{
          color: "rgba(255,255,255,0.85)",
          caretColor: "white",
        }}
      />

      <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
        Changes auto-save after you stop typing.
      </p>
    </div>
  );
}
