"use client";
import InteractiveEQ from "@/components/interactive/InteractiveEQ";
import CompressorLab from "@/components/interactive/CompressorLab";
import ReverbLab from "@/components/interactive/ReverbLab";
import PannerLab from "@/components/interactive/PannerLab";
import DelayLab from "@/components/interactive/DelayLab";
import GateLab from "@/components/interactive/GateLab";
import SignalFlowDiagram from "@/components/interactive/SignalFlowDiagram";
import type { ContentBlock, InteractiveBlockContent } from "@/types";

export default function InteractiveBlock({ block }: { block: ContentBlock }) {
  const content = block.content as InteractiveBlockContent;
  switch (content.subtype) {
    case "eq":
      return (
        <InteractiveEQ
          title={content.title}
          description={content.description}
          audioUrl={content.audioUrl}
        />
      );
    case "compressor":
      return (
        <CompressorLab
          title={content.title}
          description={content.description}
          audioUrl={content.audioUrl}
        />
      );
    case "reverb":
      return (
        <ReverbLab
          title={content.title}
          description={content.description}
          audioUrl={content.audioUrl}
        />
      );
    case "panner":
      return (
        <PannerLab
          title={content.title}
          description={content.description}
          audioUrl={content.audioUrl}
        />
      );
    case "delay":
      return (
        <DelayLab
          title={content.title}
          description={content.description}
          audioUrl={content.audioUrl}
        />
      );
    case "gate":
      return (
        <GateLab
          title={content.title}
          description={content.description}
          audioUrl={content.audioUrl}
        />
      );
    case "signal_flow":
      return <SignalFlowDiagram />;
    default:
      return null;
  }
}
