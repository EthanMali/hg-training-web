"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import Select from "@/components/ui/Select";
import { Input, Textarea } from "@/components/ui/Input";
import type { ContentBlock, DiagramBlockContent, DiagramHotspot } from "@/types";

interface Props {
  block: ContentBlock;
  onUpdate: (id: string, content: Record<string, unknown>) => void;
}

const DIAGRAM_OPTIONS = [
  { value: "wing-channel-strip", label: "Wing Channel Strip" },
  { value: "wing-bus-structure", label: "Wing Bus Structure" },
];

export default function DiagramBlockEditor({ block, onUpdate }: Props) {
  const content = block.content as DiagramBlockContent;
  const [svgKey, setSvgKey] = useState(content.svg_key);
  const [hotspots, setHotspots] = useState<DiagramHotspot[]>(content.hotspots ?? []);

  useEffect(() => {
    const timer = setTimeout(() => onUpdate(block.id, { svg_key: svgKey, hotspots }), 600);
    return () => clearTimeout(timer);
  }, [svgKey, hotspots, block.id, onUpdate]);

  function addHotspot() {
    const newHotspot: DiagramHotspot = {
      id: Date.now().toString(),
      x: 10, y: 10, width: 20, height: 10,
      label: "New hotspot",
      description: "Describe this control...",
    };
    setHotspots((prev) => [...prev, newHotspot]);
  }

  function updateHotspot(id: string, field: keyof DiagramHotspot, value: string | number) {
    setHotspots((prev) => prev.map((h) => h.id === id ? { ...h, [field]: value } : h));
  }

  function removeHotspot(id: string) {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <div className="space-y-4">
      <Select
        label="Diagram type"
        value={svgKey}
        onChange={(e) => setSvgKey(e.target.value)}
        options={DIAGRAM_OPTIONS}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
            Hotspots ({hotspots.length})
          </label>
          <button type="button" onClick={addHotspot} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors" style={{ border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.5)" }}>
            <Plus size={12} /> Add hotspot
          </button>
        </div>

        {hotspots.map((hotspot, idx) => (
          <div key={hotspot.id} className="p-4 rounded-xl space-y-3" style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Hotspot {idx + 1}</span>
              <button type="button" onClick={() => removeHotspot(hotspot.id)} className="p-1 rounded hover:bg-red-950 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
                <Trash2 size={12} />
              </button>
            </div>
            <Input label="Label" value={hotspot.label} onChange={(e) => updateHotspot(hotspot.id, "label", e.target.value)} placeholder="HPF Cutoff" />
            <Textarea label="Description" value={hotspot.description} onChange={(e) => updateHotspot(hotspot.id, "description", e.target.value)} placeholder="Explain this control..." rows={2} />
            <div className="grid grid-cols-4 gap-2">
              {(["x", "y", "width", "height"] as const).map((field) => (
                <Input key={field} label={field.toUpperCase() + " %"} type="number" value={String(hotspot[field])} onChange={(e) => updateHotspot(hotspot.id, field, parseFloat(e.target.value) || 0)} min="0" max="100" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
