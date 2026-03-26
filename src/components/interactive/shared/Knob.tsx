"use client";
import { useRef, useState } from "react";

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  display: string;
  color: string;
  onChange: (v: number) => void;
  size?: number;
}

export default function Knob({
  label, value, min, max, display, color, onChange, size = 52,
}: KnobProps) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startV = useRef(0);
  const [active, setActive] = useState(false);

  function onDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = true;
    startY.current = e.clientY;
    startV.current = value;
    setActive(true);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const delta = (startY.current - e.clientY) / 100;
    onChange(Math.max(min, Math.min(max, startV.current + delta * (max - min))));
  }
  function onUp() { dragging.current = false; setActive(false); }

  const pct = (value - min) / (max - min);
  const angleDeg = -135 + pct * 270;
  const rad = (angleDeg * Math.PI) / 180;

  const CX = size / 2;
  const CY = size / 2;
  const R = size * (20 / 52);
  const innerR = size * (16 / 52);
  const dotOffset = R * 0.65;

  const dotX = CX + dotOffset * Math.sin(rad);
  const dotY = CY - dotOffset * Math.cos(rad);

  // Arc path
  const a0 = (-135 * Math.PI) / 180;
  const a1 = rad;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const ax0 = CX + R * Math.sin(a0), ay0 = CY - R * Math.cos(a0);
  const ax1 = CX + R * Math.sin(a1), ay1 = CY - R * Math.cos(a1);

  const dotR = size * (2.5 / 52);
  const strokeW = size * (3 / 52);
  const bodyStroke = size * (1 / 52);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg
        width={size} height={size}
        style={{ cursor: "ns-resize", touchAction: "none", userSelect: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {/* Track */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#222" strokeWidth={strokeW} />
        {/* Active arc */}
        {pct > 0 && (
          <path
            d={`M ${ax0},${ay0} A ${R} ${R} 0 ${large} 1 ${ax1},${ay1}`}
            fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
          />
        )}
        {/* Body */}
        <circle cx={CX} cy={CY} r={innerR} fill={active ? "#161616" : "#111"} stroke="#252525" strokeWidth={bodyStroke} />
        {/* Indicator dot */}
        <circle cx={dotX} cy={dotY} r={dotR} fill={color} />
      </svg>
      <p className="text-xs font-mono font-semibold" style={{ color: active ? "white" : "rgba(255,255,255,0.55)" }}>
        {display}
      </p>
      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
    </div>
  );
}
