"use client";
import { useState, type ElementType } from "react";
import { Sliders, GitBranch, Activity, Waves, AudioLines, Clock, Gauge } from "lucide-react";
import type { ContentBlock, InteractiveBlockContent, InteractiveSubtype } from "@/types";

const SUBTYPES: { type: InteractiveSubtype; label: string; desc: string; Icon: ElementType }[] = [
  { type: "eq",          label: "EQ Lab",          desc: "4-band parametric EQ — drag bands, hear the effect",       Icon: Sliders    },
  { type: "compressor",  label: "Compressor Lab",   desc: "Real compressor knobs with gain-reduction meter",          Icon: Activity   },
  { type: "reverb",      label: "Reverb Lab",       desc: "Room reverb with IR — adjust size, decay, mix",           Icon: Waves      },
  { type: "panner",      label: "Stereo Panner",    desc: "Drag the source across the stereo field",                 Icon: AudioLines },
  { type: "delay",       label: "Delay Lab",        desc: "Tap tempo delay with echo decay visualization",           Icon: Clock      },
  { type: "gate",        label: "Noise Gate",       desc: "Threshold-based gate with live level meter",              Icon: Gauge      },
  { type: "signal_flow", label: "Signal Flow",      desc: "Clickable Wing signal chain explorer",                    Icon: GitBranch  },
];

interface Props {
  block: ContentBlock;
  onUpdate: (id: string, content: Record<string, unknown>) => void;
}

export default function InteractiveBlockEditor({ block, onUpdate }: Props) {
  const content = block.content as Partial<InteractiveBlockContent>;
  const [subtype,     setSubtype]     = useState<InteractiveSubtype>(content.subtype ?? "eq");
  const [title,       setTitle]       = useState(content.title ?? "");
  const [description, setDescription] = useState(content.description ?? "");
  const [audioUrl,    setAudioUrl]    = useState(content.audioUrl ?? "");

  const showAudio =
    subtype === "eq" ||
    subtype === "compressor" ||
    subtype === "reverb" ||
    subtype === "panner" ||
    subtype === "delay" ||
    subtype === "gate";

  function save(updates: Partial<InteractiveBlockContent>) {
    const next: Record<string, unknown> = { subtype, title, description, ...updates };
    if (showAudio) next.audioUrl = audioUrl;
    onUpdate(block.id, next);
  }

  function titlePlaceholder(): string {
    switch (subtype) {
      case "eq":          return "EQ Lab";
      case "compressor":  return "Compressor Lab";
      case "reverb":      return "Reverb Lab";
      case "panner":      return "Stereo Panner";
      case "delay":       return "Delay Lab";
      case "gate":        return "Noise Gate";
      case "signal_flow": return "Signal Flow Explorer";
    }
  }

  function descPlaceholder(): string {
    switch (subtype) {
      case "eq":
        return "Try boosting the Hi Mid around 3kHz to hear it cut through…";
      case "compressor":
        return "Set the threshold to −18 dB and ratio to 4:1 — notice how the meter moves…";
      case "reverb":
        return "Increase the room size and decay — notice how the reverb tail grows…";
      case "panner":
        return "Drag the source across the stage — watch the L/R meters respond…";
      case "delay":
        return "Tap the button to set delay tempo, then adjust feedback to hear echoes fade…";
      case "gate":
        return "Drag the threshold line above the noise floor — only signal above it gets through…";
      case "signal_flow":
        return "Click each stage to learn what it does in the signal chain.";
    }
  }

  function audioHint(): string {
    switch (subtype) {
      case "eq":         return "Students will hear this clip looping while they adjust the EQ bands.";
      case "compressor": return "Students will hear this clip looping while they adjust the compressor knobs.";
      case "reverb":     return "Students will hear this clip looping while they adjust the reverb parameters.";
      case "panner":     return "Students will hear this clip loop while they drag the source across the stereo field.";
      case "delay":      return "Students will hear this clip looping while they adjust the delay and feedback.";
      case "gate":       return "Students will hear this clip looping while they set the gate threshold.";
      default:           return "Students will hear this clip looping during the interaction.";
    }
  }

  return (
    <div className="space-y-4">

      {/* Subtype picker */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Activity type</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {SUBTYPES.map(({ type, label, desc, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => { setSubtype(type); save({ subtype: type }); }}
              className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
              style={{
                border: `1px solid ${subtype === type ? "rgba(255,255,255,0.2)" : "#1e1e1e"}`,
                background: subtype === type ? "rgba(255,255,255,0.05)" : "#0a0a0a",
              }}
            >
              <Icon size={14} className="mt-0.5 flex-shrink-0"
                style={{ color: subtype === type ? "white" : "rgba(255,255,255,0.3)" }} />
              <div>
                <p className="text-xs font-semibold"
                  style={{ color: subtype === type ? "white" : "rgba(255,255,255,0.5)" }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Audio URL */}
      {showAudio && (
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
            Audio source URL
            <span className="ml-2 font-normal" style={{ color: "rgba(255,255,255,0.25)" }}>
              (direct MP3/WAV/OGG link — must have CORS headers)
            </span>
          </label>
          <div className="relative">
            <Link size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "rgba(255,255,255,0.25)" }} />
            <input
              value={audioUrl}
              onChange={e => setAudioUrl(e.target.value)}
              onBlur={() => save({})}
              placeholder="https://example.com/audio/drum-loop.mp3"
              className="w-full h-9 pl-8 pr-3 rounded-lg text-sm outline-none"
              style={{ background: "#111", border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.8)" }}
            />
          </div>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.22)" }}>
            {audioHint()} Use a short loop (4–16 bars). Supabase Storage public URLs work great.
          </p>
        </div>
      )}

      {/* Optional title */}
      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          Title <span className="font-normal" style={{ color: "rgba(255,255,255,0.25)" }}>(optional)</span>
        </label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => save({})}
          placeholder={titlePlaceholder()}
          className="w-full h-9 px-3 rounded-lg text-sm outline-none"
          style={{ background: "#111", border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.8)" }}
        />
      </div>

      {/* Optional description / instructions */}
      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          Instructions <span className="font-normal" style={{ color: "rgba(255,255,255,0.25)" }}>(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => save({})}
          placeholder={descPlaceholder()}
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ background: "#111", border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.8)" }}
        />
      </div>
    </div>
  );
}
