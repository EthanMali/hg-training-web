import type { ContentBlock, ImageBlockContent } from "@/types";

interface Props { block: ContentBlock; }

export default function ImageBlock({ block }: Props) {
  const content = block.content as ImageBlockContent;
  return (
    <figure className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={content.url}
        alt={content.alt}
        className="w-full rounded-xl"
        style={{ border: "1px solid #1a1a1a" }}
      />
      {content.caption && (
        <figcaption className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}
