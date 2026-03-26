"use client";
import { useState } from "react";
import type { ContentBlock, DiagramBlockContent, DiagramHotspot } from "@/types";

interface Props { block: ContentBlock; }

// SVG diagrams for Wing sections
const DIAGRAMS: Record<string, string> = {
  "wing-channel-strip": `
    <svg viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <rect width="200" height="500" fill="#0a0a0a" rx="8"/>
      <!-- Channel header -->
      <rect x="10" y="10" width="180" height="30" fill="#1a1a1a" rx="4"/>
      <text x="100" y="30" fill="#888" font-size="11" text-anchor="middle" font-family="monospace">CH 1</text>
      <!-- Input gain -->
      <rect x="10" y="55" width="180" height="50" fill="#111" rx="4"/>
      <text x="100" y="72" fill="#666" font-size="9" text-anchor="middle" font-family="monospace">INPUT GAIN</text>
      <rect x="90" y="78" width="20" height="20" fill="#222" rx="10" stroke="#444" stroke-width="1"/>
      <line x1="100" y1="78" x2="100" y2="88" stroke="#aaa" stroke-width="1.5" stroke-linecap="round"/>
      <!-- HPF -->
      <rect x="10" y="115" width="85" height="50" fill="#111" rx="4"/>
      <text x="52" y="132" fill="#666" font-size="9" text-anchor="middle" font-family="monospace">HPF</text>
      <path d="M 25 155 Q 45 135 65 135 L 85 135" fill="none" stroke="#4ade80" stroke-width="1.5"/>
      <!-- LPF -->
      <rect x="105" y="115" width="85" height="50" fill="#111" rx="4"/>
      <text x="147" y="132" fill="#666" font-size="9" text-anchor="middle" font-family="monospace">LPF</text>
      <path d="M 110 135 L 130 135 Q 150 135 165 155" fill="none" stroke="#60a5fa" stroke-width="1.5"/>
      <!-- EQ section -->
      <rect x="10" y="175" width="180" height="120" fill="#111" rx="4"/>
      <text x="100" y="192" fill="#666" font-size="9" text-anchor="middle" font-family="monospace">4-BAND PARAMETRIC EQ</text>
      <path d="M 20 250 Q 40 220 60 245 Q 80 270 100 235 Q 120 200 140 240 Q 160 260 180 245" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
      <!-- EQ band knobs -->
      <circle cx="42" cy="275" r="8" fill="#1e1e1e" stroke="#333" stroke-width="1"/>
      <circle cx="74" cy="275" r="8" fill="#1e1e1e" stroke="#333" stroke-width="1"/>
      <circle cx="126" cy="275" r="8" fill="#1e1e1e" stroke="#333" stroke-width="1"/>
      <circle cx="158" cy="275" r="8" fill="#1e1e1e" stroke="#333" stroke-width="1"/>
      <text x="42" y="295" fill="#555" font-size="7" text-anchor="middle" font-family="monospace">LF</text>
      <text x="74" y="295" fill="#555" font-size="7" text-anchor="middle" font-family="monospace">LMF</text>
      <text x="126" y="295" fill="#555" font-size="7" text-anchor="middle" font-family="monospace">HMF</text>
      <text x="158" y="295" fill="#555" font-size="7" text-anchor="middle" font-family="monospace">HF</text>
      <!-- Dynamics -->
      <rect x="10" y="305" width="85" height="50" fill="#111" rx="4"/>
      <text x="52" y="322" fill="#666" font-size="9" text-anchor="middle" font-family="monospace">GATE</text>
      <circle cx="35" cy="340" r="7" fill="#1e1e1e" stroke="#333" stroke-width="1"/>
      <circle cx="55" cy="340" r="7" fill="#1e1e1e" stroke="#333" stroke-width="1"/>
      <circle cx="75" cy="340" r="7" fill="#1e1e1e" stroke="#333" stroke-width="1"/>
      <rect x="105" y="305" width="85" height="50" fill="#111" rx="4"/>
      <text x="147" y="322" fill="#666" font-size="9" text-anchor="middle" font-family="monospace">COMP</text>
      <circle cx="125" cy="340" r="7" fill="#1e1e1e" stroke="#333" stroke-width="1"/>
      <circle cx="147" cy="340" r="7" fill="#1e1e1e" stroke="#333" stroke-width="1"/>
      <circle cx="169" cy="340" r="7" fill="#1e1e1e" stroke="#333" stroke-width="1"/>
      <!-- Fader -->
      <rect x="88" y="365" width="24" height="110" fill="#111" rx="4"/>
      <rect x="82" y="420" width="36" height="12" fill="#2a2a2a" rx="2"/>
      <rect x="84" y="422" width="32" height="1" fill="#555"/>
      <text x="100" y="490" fill="#555" font-size="8" text-anchor="middle" font-family="monospace">FADER</text>
      <!-- Mute / Solo -->
      <rect x="10" y="365" width="70" height="22" fill="#7f1d1d" rx="4"/>
      <text x="45" y="381" fill="#fca5a5" font-size="9" text-anchor="middle" font-family="monospace">MUTE</text>
      <rect x="120" y="365" width="70" height="22" fill="#1a3a1a" rx="4"/>
      <text x="155" y="381" fill="#4ade80" font-size="9" text-anchor="middle" font-family="monospace">SOLO</text>
    </svg>
  `,
  "wing-bus-structure": `
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <rect width="400" height="300" fill="#0a0a0a" rx="8"/>
      <!-- Input channels -->
      <text x="20" y="25" fill="#555" font-size="10" font-family="monospace">INPUT CHANNELS</text>
      ${Array.from({length:8}, (_,i) => `
        <rect x="${20 + i*38}" y="35" width="28" height="60" fill="#111" rx="3" stroke="#1e1e1e" stroke-width="1"/>
        <text x="${34 + i*38}" y="55" fill="#555" font-size="7" text-anchor="middle" font-family="monospace">CH</text>
        <text x="${34 + i*38}" y="66" fill="#555" font-size="7" text-anchor="middle" font-family="monospace">${i+1}</text>
        <line x1="${34 + i*38}" y1="95" x2="${34 + i*38}" y2="120" stroke="#2a2a2a" stroke-width="1"/>
      `).join('')}
      <!-- Mix buses -->
      <text x="20" y="145" fill="#555" font-size="10" font-family="monospace">AUX / MIX BUSES</text>
      ${Array.from({length:6}, (_,i) => `
        <rect x="${20 + i*48}" y="155" width="38" height="45" fill="#111" rx="3" stroke="#1a3a1a" stroke-width="1"/>
        <text x="${39 + i*48}" y="172" fill="#4ade80" font-size="7" text-anchor="middle" font-family="monospace">MIX</text>
        <text x="${39 + i*48}" y="183" fill="#4ade80" font-size="7" text-anchor="middle" font-family="monospace">${i+1}</text>
        <line x1="${39 + i*48}" y1="200" x2="${39 + i*48}" y2="225" stroke="#2a2a2a" stroke-width="1"/>
      `).join('')}
      <!-- Main LR -->
      <rect x="310" y="155" width="70" height="45" fill="#1a1a00" rx="3" stroke="#666600" stroke-width="1"/>
      <text x="345" y="172" fill="#fbbf24" font-size="8" text-anchor="middle" font-family="monospace">MAIN</text>
      <text x="345" y="183" fill="#fbbf24" font-size="8" text-anchor="middle" font-family="monospace">L/R</text>
      <!-- Matrix -->
      <text x="20" y="248" fill="#555" font-size="10" font-family="monospace">MATRIX</text>
      ${Array.from({length:4}, (_,i) => `
        <rect x="${20 + i*58}" y="255" width="48" height="35" fill="#111" rx="3" stroke="#1e3a5e" stroke-width="1"/>
        <text x="${44 + i*58}" y="274" fill="#60a5fa" font-size="8" text-anchor="middle" font-family="monospace">MTX ${i+1}</text>
      `).join('')}
    </svg>
  `,
};

export default function DiagramBlock({ block }: Props) {
  const content = block.content as DiagramBlockContent;
  const [activeHotspot, setActiveHotspot] = useState<DiagramHotspot | null>(null);
  const svgContent = DIAGRAMS[content.svg_key];

  return (
    <div className="space-y-3">
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ border: "1px solid #1a1a1a", background: "#080808" }}
      >
        {svgContent ? (
          <div dangerouslySetInnerHTML={{ __html: svgContent }} />
        ) : (
          <div className="h-48 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.2)" }}>
            Diagram: {content.svg_key}
          </div>
        )}

        {/* Hotspot overlays */}
        {content.hotspots?.map((hotspot) => (
          <button
            key={hotspot.id}
            onClick={() => setActiveHotspot(activeHotspot?.id === hotspot.id ? null : hotspot)}
            className="absolute transition-all duration-150"
            style={{
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              width: `${hotspot.width}%`,
              height: `${hotspot.height}%`,
              border: activeHotspot?.id === hotspot.id ? "2px solid rgba(255,255,255,0.8)" : "1px dashed rgba(255,255,255,0.2)",
              background: activeHotspot?.id === hotspot.id ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.02)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title={hotspot.label}
          />
        ))}
      </div>

      {/* Hotspot tooltip */}
      {activeHotspot && (
        <div
          className="p-4 rounded-xl animate-fade-in"
          style={{ border: "1px solid #2a2a2a", background: "#111" }}
        >
          <p className="text-sm font-semibold text-white mb-1">{activeHotspot.label}</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{activeHotspot.description}</p>
          <button onClick={() => setActiveHotspot(null)} className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
            Dismiss
          </button>
        </div>
      )}

      {content.hotspots?.length > 0 && !activeHotspot && (
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          Click on highlighted areas to learn more
        </p>
      )}
    </div>
  );
}
