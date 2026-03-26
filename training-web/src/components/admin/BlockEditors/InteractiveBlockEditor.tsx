"use client";
import { useState } from "react";
import { Sliders, GitBranch } from "lucide-react";
import type { ContentBlock, InteractiveBlockContent, InteractiveSubtype } from "@/types";

const SUBTYPES: { type: InteractiveSubtype; label: string; desc: string; Icon: React.ElementType }[] = [
  { type: "eq",          label: "EQ Lab",            desc: "Draggable 4-band parametric EQ visualizer",   Icon: Sliders },
  { type: "signal_flow", label: "Signal Flow",        desc: "Clickable Wing signal chain explorer",        Icon: GitBranch },
];

interface Props {
  block: ContentBlock;
  onUpdate: (id: string, content: Record<string, unknown>) => void;
}

export default function InteractiveBlockEditor({ block, onUpdate }: Props) {
  const content = block.content as Partial<InteractiveBlockContent>;
  const [subtype, setSubtype] = useState<InteractiveSubtype>(content.subtype ?? "eq");
  const [title, setTitle] = useState(content.title ?? "");
  const [description, setDescription] = useState(content.description ?? "");

  function save(updates: Partial<InteractiveBlockContent>) {
    const next = { subtype, title, description, ...updates };
    onUpdate(block.id, next);
  }

  return (
    <div className="space-y-4">
      {/* Subtype picker */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Activity type</p>
        <div className="grid grid-cols-2 gap-2">
          {SUBTYPES.map(({ type, label, desc, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => { setSubtype(type); save({ subtype: type }); }}
              className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
              style={{
                border: `1px solid ${subtype === type ? "rgba(255,255,255,0.2)" : "#1e1e1e"}`,
                background: subtype === type ? "rgba(255,255,255,0.05)" : "#0a0a0a",
              }}
            >
              <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: subtype === type ? "white" : "rgba(255,255,255,0.3)" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: subtype === type ? "white" : "rgba(255,255,255,0.5)" }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Optional title */}
      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Title (optional)</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => save({})}
          placeholder={subtype === "eq" ? "Interactive EQ Lab" : "Signal Flow Explorer"}
          className="w-full h-9 px-3 rounded-lg text-sm outline-none"
          style={{ background: "#111", border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.8)" }}
        />
      </div>

      {/* Optional description */}
      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Instructions / description (optional)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => save({})}
          placeholder="Drag the bands and try boosting the high-mids around 3kHz..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ background: "#111", border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.8)" }}
        />
      </div>
    </div>
  );
}
