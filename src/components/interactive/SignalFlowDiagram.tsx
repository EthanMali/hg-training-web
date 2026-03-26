"use client";
import { useState } from "react";

interface Stage {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  tips: string[];
}

const STAGES: Stage[] = [
  {
    id: "source",
    label: "Source",
    shortLabel: "SRC",
    color: "#6366f1",
    description: "The origin of the audio signal — a microphone, DI box, or instrument plugged into a stage box or the Wing's local XLR inputs.",
    tips: [
      "Dynamic mics (SM58, Beta52) need no power",
      "Condenser mics need +48V phantom power",
      "DI boxes convert instrument level to mic level",
    ],
  },
  {
    id: "preamp",
    label: "Preamp / HA",
    shortLabel: "HA",
    color: "#3b82f6",
    description: "The head amplifier boosts the mic-level signal to line level. This is where you set gain. Get this right and everything downstream works. Get it wrong and nothing will fix it.",
    tips: [
      "Target -18 to -12 dBFS on loud passages",
      "Set gain BEFORE touching EQ or compression",
      "Never clip the preamp — turn it down first",
    ],
  },
  {
    id: "hpf",
    label: "High-Pass Filter",
    shortLabel: "HPF",
    color: "#0ea5e9",
    description: "Rolls off frequencies below a cutoff point. Removes rumble, handling noise, and low-end mud before it ever hits the EQ or compressor.",
    tips: [
      "80–100 Hz is a safe default for most vocals",
      "Kick drum and bass DI usually don't need HPF",
      "Engage HPF on every mic that isn't a bass source",
    ],
  },
  {
    id: "gate",
    label: "Gate",
    shortLabel: "GATE",
    color: "#10b981",
    description: "Silences the channel when it falls below the threshold. Used to cut bleed between open microphones — especially drums.",
    tips: [
      "Start with a threshold around -40 dB for drums",
      "Set release long enough so you don't hear chopping",
      "Range controls how much attenuation when closed",
    ],
  },
  {
    id: "eq",
    label: "EQ",
    shortLabel: "EQ",
    color: "#f59e0b",
    description: "4-band parametric EQ with low-cut and high-cut shelves. Each band has Frequency, Gain, and Q (width). Cut to fix problems; boost to enhance character.",
    tips: [
      "Cut first — removes problems without adding noise",
      "Use high Q for surgical cuts, low Q for musical boosts",
      "Sweep a boosted band to find problem frequencies",
    ],
  },
  {
    id: "comp",
    label: "Compressor",
    shortLabel: "COMP",
    color: "#f97316",
    description: "Reduces dynamic range — makes loud peaks quieter and (with make-up gain) brings up quieter passages. Produces a more consistent, controlled signal.",
    tips: [
      "4:1 ratio is a good all-purpose starting point",
      "Slower attack lets transients punch through",
      "Add make-up gain to compensate for gain reduction",
    ],
  },
  {
    id: "fader",
    label: "Fader / Pan",
    shortLabel: "FADER",
    color: "#ec4899",
    description: "The channel fader sets the level of this channel in the overall mix. Pan places it in the stereo field. Unity gain (0 dB) is the standard starting position.",
    tips: [
      "Faders at unity (0 dB) is your default position",
      "Pan hard left/right for guitars to create width",
      "Bring up the fader last — after EQ and dynamics are set",
    ],
  },
  {
    id: "bus",
    label: "Mix Bus",
    shortLabel: "BUS",
    color: "#8b5cf6",
    description: "The summing point where multiple channels combine. Each channel sends to the main LR bus and optionally to aux buses (monitors, FX). The bus has its own EQ and dynamics.",
    tips: [
      "Main LR is your front-of-house mix",
      "Aux buses feed monitor mixes and effects",
      "DCA groups control multiple channels without mixing",
    ],
  },
  {
    id: "output",
    label: "Output",
    shortLabel: "OUT",
    color: "#ef4444",
    description: "The final output — typically XLR to your amplifiers and speakers. The Wing can output to local XLRs, AES50 to stage boxes, or AES digital.",
    tips: [
      "Output level is set by the bus fader",
      "Use delay on outputs for time-aligned speakers",
      "Matrix outputs allow zone mixing (FOH + lobby + stream)",
    ],
  },
];

export default function SignalFlowDiagram() {
  const [selected, setSelected] = useState<string | null>("preamp");

  const selectedStage = STAGES.find(s => s.id === selected);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e", background: "#080808" }}>
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
        <p className="text-sm font-semibold text-white">Signal Flow Explorer</p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Click any stage to learn what it does in the signal chain
        </p>
      </div>

      {/* Flow chain */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {STAGES.map((stage, i) => (
            <div key={stage.id} className="flex items-center flex-shrink-0">
              <button
                onClick={() => setSelected(stage.id === selected ? null : stage.id)}
                className="flex flex-col items-center gap-1.5 px-2 py-2 rounded-xl transition-all duration-150"
                style={{
                  background: selected === stage.id ? stage.color + "20" : "transparent",
                  border: `1px solid ${selected === stage.id ? stage.color + "60" : "transparent"}`,
                  minWidth: "58px",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: selected === stage.id ? stage.color : stage.color + "20",
                    border: `1px solid ${stage.color}40`,
                    color: selected === stage.id ? "white" : stage.color,
                  }}
                >
                  {stage.shortLabel}
                </div>
                <span className="text-xs leading-tight text-center" style={{ color: selected === stage.id ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)", maxWidth: "52px" }}>
                  {stage.label}
                </span>
              </button>

              {/* Arrow */}
              {i < STAGES.length - 1 && (
                <div className="flex-shrink-0 mx-0.5" style={{ color: "rgba(255,255,255,0.15)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d="M 1 6 L 9 6 M 7 3 L 10 6 L 7 9" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selectedStage && (
        <div className="px-5 pb-5">
          <div className="rounded-xl p-4" style={{ background: selectedStage.color + "10", border: `1px solid ${selectedStage.color}30` }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedStage.color }} />
              <h3 className="text-sm font-semibold text-white">{selectedStage.label}</h3>
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.65)" }}>
              {selectedStage.description}
            </p>
            <div className="space-y-1.5">
              {selectedStage.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: selectedStage.color }}>→</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
