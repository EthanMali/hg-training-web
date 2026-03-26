import type { ContentBlock, CalloutBlockContent } from "@/types";

interface Props { block: ContentBlock; }

const variants = {
  tip: { bg: "rgba(16, 44, 24, 0.8)", border: "#14532d", icon: "💡", label: "Tip", labelColor: "#4ade80" },
  warning: { bg: "rgba(44, 30, 0, 0.8)", border: "#78350f", icon: "⚠️", label: "Warning", labelColor: "#fbbf24" },
  info: { bg: "rgba(10, 26, 54, 0.8)", border: "#1e3a8a", icon: "ℹ️", label: "Info", labelColor: "#60a5fa" },
  note: { bg: "rgba(25, 25, 25, 0.8)", border: "#2a2a2a", icon: "📝", label: "Note", labelColor: "#a3a3a3" },
};

export default function CalloutBlock({ block }: Props) {
  const content = block.content as CalloutBlockContent;
  const v = variants[content.variant] ?? variants.note;

  return (
    <div
      className="flex gap-3 p-4 rounded-xl"
      style={{ background: v.bg, border: `1px solid ${v.border}` }}
    >
      <span className="text-base flex-shrink-0 leading-6">{v.icon}</span>
      <div>
        <p className="text-xs font-semibold mb-1" style={{ color: v.labelColor }}>{v.label}</p>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{content.body}</p>
      </div>
    </div>
  );
}
