import type { ContentBlock, TextBlockContent } from "@/types";

interface Props { block: ContentBlock; }

export default function TextBlock({ block }: Props) {
  const content = block.content as TextBlockContent;
  return (
    <div
      className="prose-dark"
      dangerouslySetInnerHTML={{ __html: content.html }}
    />
  );
}
