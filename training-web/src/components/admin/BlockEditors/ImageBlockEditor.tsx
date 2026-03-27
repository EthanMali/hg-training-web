"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import type { ContentBlock, ImageBlockContent } from "@/types";

interface Props {
  block: ContentBlock;
  onUpdate: (id: string, content: Record<string, unknown>) => void;
}

export default function ImageBlockEditor({ block, onUpdate }: Props) {
  const content = block.content as ImageBlockContent;
  const [url, setUrl] = useState(content.url);
  const [alt, setAlt] = useState(content.alt);
  const [caption, setCaption] = useState(content.caption ?? "");

  useEffect(() => {
    const timer = setTimeout(() => onUpdate(block.id, { url, alt, caption }), 600);
    return () => clearTimeout(timer);
  }, [url, alt, caption, block.id, onUpdate]);

  return (
    <div className="space-y-3">
      <Input label="Image URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
      <Input label="Alt text" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image for accessibility" />
      <Input label="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional caption beneath the image" />
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="w-full max-h-48 object-cover rounded-lg mt-2" style={{ border: "1px solid #1a1a1a" }} />
      )}
    </div>
  );
}
