"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { RotateCcw, Info } from "lucide-react";

/* ── Constants ──────────────────────────────────────── */
const W = 560;
const H = 180;
const PAD = { t: 16, r: 16, b: 32, l: 44 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;
const FMIN = 20, FMAX = 20000;
const GMIN = -14, GMAX = 14;
const NPTS = 300;

const FREQ_LABELS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const GAIN_LABELS = [12, 6, 0, -6, -12];

/* ── Math helpers ───────────────────────────────────── */
function fToX(f: number) {
  return (Math.log10(f / FMIN) / Math.log10(FMAX / FMIN)) * PW;
}
function gToY(g: number) {
  return ((GMAX - g) / (GMAX - GMIN)) * PH;
}
function xToF(x: number) {
  return FMIN * Math.pow(FMAX / FMIN, x / PW);
}
function yToG(y: number) {
  return GMAX - (y / PH) * (GMAX - GMIN);
}

function calcResponse(bands: Band[], f: number): number {
  let total = 0;
  for (const b of bands) {
    if (Math.abs(b.gain) < 0.01) continue;
    const lr = Math.log2(f / b.freq);
    total += b.gain * Math.exp(-(lr * lr) * b.q * 0.9);
  }
  return Math.max(GMIN, Math.min(GMAX, total));
}

function buildPath(bands: Band[]): string {
  const pts = Array.from({ length: NPTS }, (_, i) => {
    const f = FMIN * Math.pow(FMAX / FMIN, i / (NPTS - 1));
    const x = fToX(f) + PAD.l;
    const y = gToY(calcResponse(bands, f)) + PAD.t;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${pts.join(" L ")}`;
}

/* ── Types ──────────────────────────────────────────── */
interface Band {
  id: number;
  freq: number;
  gain: number;
  q: number;
  color: string;
  label: string;
}

const DEFAULT_BANDS: Band[] = [
  { id: 0, freq: 80,   gain: 0, q: 0.9, color: "#3b82f6", label: "Low" },
  { id: 1, freq: 400,  gain: 0, q: 1.2, color: "#10b981", label: "Low-Mid" },
  { id: 2, freq: 3000, gain: 0, q: 1.2, color: "#f59e0b", label: "High-Mid" },
  { id: 3, freq: 12000,gain: 0, q: 0.9, color: "#ef4444", label: "High" },
];

function fmtFreq(f: number) {
  return f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k` : `${Math.round(f)}`;
}

/* ── Component ──────────────────────────────────────── */
interface Props {
  title?: string;
  description?: string;
}

export default function InteractiveEQ({ title, description }: Props) {
  const [bands, setBands] = useState<Band[]>(DEFAULT_BANDS);
  const [active, setActive] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: number; startX: number; startY: number; startFreq: number; startGain: number } | null>(null);

  const getSVGCoords = useCallback((e: PointerEvent | React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX - PAD.l,
      y: (e.clientY - rect.top) * scaleY - PAD.t,
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<SVGCircleElement>, id: number) => {
    e.stopPropagation();
    (e.target as SVGCircleElement).setPointerCapture(e.pointerId);
    const band = DEFAULT_BANDS.find(b => b.id === id)!;
    const { x, y } = getSVGCoords(e);
    dragRef.current = { id, startX: x, startY: y, startFreq: bands[id].freq, startGain: bands[id].gain };
    setActive(id);
    void band;
  }, [bands, getSVGCoords]);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const { id, startX, startY, startFreq, startGain } = dragRef.current;
    const { x, y } = getSVGCoords(e);

    const dx = x - startX;
    const dy = y - startY;

    // Map pixel delta to frequency/gain change
    const logF = Math.log10(startFreq / FMIN) / Math.log10(FMAX / FMIN);
    const newLogF = Math.max(0, Math.min(1, logF + dx / PW));
    const newFreq = FMIN * Math.pow(FMAX / FMIN, newLogF);
    const newGain = Math.max(GMIN, Math.min(GMAX, startGain - (dy / PH) * (GMAX - GMIN)));

    setBands(prev => prev.map(b => b.id === id ? { ...b, freq: newFreq, gain: newGain } : b));
  }, [getSVGCoords]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setActive(null);
  }, []);

  function reset() {
    setBands(DEFAULT_BANDS.map(b => ({ ...b })));
  }

  const path = buildPath(bands);
  const zeroY = gToY(0) + PAD.t;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e", background: "#080808" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div>
          <p className="text-sm font-semibold text-white">{title || "Interactive EQ Lab"}</p>
          {description && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowInfo(!showInfo)} className="p-1.5 rounded-md hover:bg-white/5 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Info size={14} />
          </button>
          <button onClick={reset} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5" style={{ color: "rgba(255,255,255,0.4)" }}>
            <RotateCcw size={11} /> Reset
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="px-5 py-3 text-xs" style={{ background: "#0a0800", borderBottom: "1px solid #1a1a1a", color: "rgba(255,255,255,0.5)" }}>
          <strong className="text-amber-400">How to use:</strong> Drag the coloured dots to adjust each EQ band. Left/right changes frequency, up/down changes gain (boost/cut). Try boosting the High-Mid around 3kHz to hear how presence is added to a vocal.
        </div>
      )}

      {/* SVG EQ display */}
      <div className="px-4 pt-4 pb-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ cursor: active !== null ? "grabbing" : "default", userSelect: "none" }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* Grid lines — gain */}
          {GAIN_LABELS.map(g => {
            const y = gToY(g) + PAD.t;
            return (
              <g key={g}>
                <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
                  stroke={g === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}
                  strokeWidth={g === 0 ? 1 : 0.5}
                  strokeDasharray={g === 0 ? "none" : "2,3"}
                />
                <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.3)">
                  {g > 0 ? `+${g}` : g}
                </text>
              </g>
            );
          })}

          {/* Grid lines — frequency */}
          {FREQ_LABELS.map(f => {
            const x = fToX(f) + PAD.l;
            return (
              <g key={f}>
                <line x1={x} y1={PAD.t} x2={x} y2={H - PAD.b}
                  stroke="rgba(255,255,255,0.05)" strokeWidth={0.5}
                />
                <text x={x} y={H - PAD.b + 12} textAnchor="middle" fontSize={8.5} fill="rgba(255,255,255,0.3)">
                  {fmtFreq(f)}
                </text>
              </g>
            );
          })}

          {/* Clip region */}
          <clipPath id="eq-clip">
            <rect x={PAD.l} y={PAD.t} width={PW} height={PH} />
          </clipPath>

          {/* Fill under curve */}
          <path
            d={`${path} L ${W - PAD.r},${zeroY} L ${PAD.l},${zeroY} Z`}
            fill="rgba(255,255,255,0.04)"
            clipPath="url(#eq-clip)"
          />

          {/* Curve */}
          <path
            d={path}
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={1.5}
            clipPath="url(#eq-clip)"
          />

          {/* Band handles */}
          {bands.map(band => {
            const cx = fToX(band.freq) + PAD.l;
            const cy = gToY(band.gain) + PAD.t;
            const isActive = active === band.id;
            const isHov = hovered === band.id;
            return (
              <g key={band.id}>
                {/* Crosshair lines */}
                {(isActive || isHov) && (
                  <>
                    <line x1={cx} y1={PAD.t} x2={cx} y2={H - PAD.b} stroke={band.color} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.4} clipPath="url(#eq-clip)" />
                    <line x1={PAD.l} y1={cy} x2={W - PAD.r} y2={cy} stroke={band.color} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.4} clipPath="url(#eq-clip)" />
                  </>
                )}

                {/* Handle circle */}
                <circle
                  cx={cx} cy={cy} r={isActive ? 9 : isHov ? 8 : 6}
                  fill={band.color}
                  fillOpacity={isActive ? 1 : 0.85}
                  stroke={isActive ? "white" : band.color}
                  strokeWidth={isActive ? 1.5 : 0}
                  style={{ cursor: "grab" }}
                  onPointerDown={(e) => onPointerDown(e, band.id)}
                  onPointerEnter={() => setHovered(band.id)}
                  onPointerLeave={() => setHovered(null)}
                  clipPath="url(#eq-clip)"
                />

                {/* Tooltip */}
                {(isActive || isHov) && (
                  <g>
                    <rect
                      x={Math.min(cx + 8, W - PAD.r - 70)} y={cy - 22}
                      width={66} height={20} rx={4}
                      fill="#111" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5}
                    />
                    <text
                      x={Math.min(cx + 12, W - PAD.r - 66)} y={cy - 8}
                      fontSize={9} fill="white"
                    >
                      {fmtFreq(band.freq)}Hz  {band.gain >= 0 ? "+" : ""}{band.gain.toFixed(1)}dB
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Band strip */}
      <div className="grid grid-cols-4 gap-px px-4 pb-4" style={{ borderTop: "1px solid #111" }}>
        {bands.map(band => (
          <div key={band.id} className="pt-3 text-center">
            <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ background: band.color }} />
            <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{band.label}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: band.color }}>
              {fmtFreq(band.freq)}Hz
            </p>
            <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>
              {band.gain >= 0 ? "+" : ""}{band.gain.toFixed(1)} dB
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
