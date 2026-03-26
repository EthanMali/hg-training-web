"use client";
import InteractiveEQ from "@/components/interactive/InteractiveEQ";
import SignalFlowDiagram from "@/components/interactive/SignalFlowDiagram";
import type { ContentBlock, InteractiveBlockContent } from "@/types";

export default function InteractiveBlock({ block }: { block: ContentBlock }) {
  const content = block.content as InteractiveBlockContent;
  switch (content.subtype) {
    case "eq":
      return <InteractiveEQ title={content.title} description={content.description} />;
    case "signal_flow":
      return <SignalFlowDiagram />;
    default:
      return null;
  }
}
