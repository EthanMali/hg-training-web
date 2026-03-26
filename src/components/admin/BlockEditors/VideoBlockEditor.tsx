"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import type { ContentBlock, VideoBlockContent } from "@/types";

interface Props {
  block: ContentBlock;
  onUpdate: (id: string, content: Record<string, unknown>) => void;
}

export default function VideoBlockEditor({ block, onUpdate }: Props) {
  const content = block.content as VideoBlockContent;
  const [url, setUrl] = useState(content.url);
  const [caption, setCaption] = useState(content.caption ?? "");

  useEffect(() => {
    const timer = setTimeout(() => onUpdate(block.id, { url, caption }), 600);
    return () => clearTimeout(timer);
  }, [url, caption, block.id, onUpdate]);

  return (
    <div className="space-y-3">
      <Input label="Video URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=... or Vimeo URL" hint="Supports YouTube and Vimeo URLs, or direct video links" />
      <Input label="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Brief description of the video" />
    </div>
  );
}
