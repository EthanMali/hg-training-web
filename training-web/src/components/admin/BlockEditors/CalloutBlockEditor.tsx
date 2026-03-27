"use client";
import { useState, useEffect } from "react";
import Select from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Input";
import type { ContentBlock, CalloutBlockContent } from "@/types";

interface Props {
  block: ContentBlock;
  onUpdate: (id: string, content: Record<string, unknown>) => void;
}

export default function CalloutBlockEditor({ block, onUpdate }: Props) {
  const content = block.content as CalloutBlockContent;
  const [variant, setVariant] = useState(content.variant);
  const [body, setBody] = useState(content.body);

  useEffect(() => {
    const timer = setTimeout(() => onUpdate(block.id, { variant, body }), 600);
    return () => clearTimeout(timer);
  }, [variant, body, block.id, onUpdate]);

  return (
    <div className="space-y-3">
      <Select
        label="Type"
        value={variant}
        onChange={(e) => setVariant(e.target.value as "tip" | "warning" | "info" | "note")}
        options={[
          { value: "tip", label: "💡 Tip" },
          { value: "warning", label: "⚠️ Warning" },
          { value: "info", label: "ℹ️ Info" },
          { value: "note", label: "📝 Note" },
        ]}
      />
      <Textarea label="Content" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Enter the callout message..." rows={3} />
    </div>
  );
}
