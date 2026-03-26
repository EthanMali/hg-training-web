import type { ContentBlock, VideoBlockContent } from "@/types";

interface Props { block: ContentBlock; }

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // Direct video URL
  return null;
}

export default function VideoBlock({ block }: Props) {
  const content = block.content as VideoBlockContent;
  const embedUrl = getEmbedUrl(content.url);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl" style={{ background: "#000", paddingTop: "56.25%" }}>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            src={content.url}
            controls
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>
      {content.caption && (
        <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)" }}>{content.caption}</p>
      )}
    </div>
  );
}
