"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BandState {
  id: string;
  label: string;
  color: string;
  type: BiquadFilterType;
  freq: number;
  gain: number;
  q: number;
}

interface Props {
  title?: string;
  description?: string;
  audioUrl?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const MIN_GAIN = -14;
const MAX_GAIN = 14;
const SVG_W = 640;
const SVG_H = 180;
const N = 512;

const FREQ_AXIS = [
  { f: 20, label: "20" }, { f: 50, label: "50" }, { f: 100, label: "100" },
  { f: 200, label: "200" }, { f: 500, label: "500" }, { f: 1000, label: "1k" },
  { f: 2000, label: "2k" }, { f: 5000, label: "5k" }, { f: 10000, label: "10k" },
  { f: 20000, label: "20k" },
];
const DB_GRID = [-12, -6, 0, 6, 12];

const DEFAULT_BANDS: BandState[] = [
  { id: "low",   label: "Low",     color: "#6366f1", type: "lowshelf",  freq: 100,   gain: 0, q: 0.7 },
  { id: "lomid", label: "Low Mid", color: "#10b981", type: "peaking",   freq: 500,   gain: 0, q: 1.4 },
  { id: "himid", label: "Hi Mid",  color: "#f59e0b", type: "peaking",   freq: 3000,  gain: 0, q: 1.4 },
  { id: "high",  label: "High",    color: "#ef4444", type: "highshelf", freq: 10000, gain: 0, q: 0.7 },
];

// ── Math helpers ──────────────────────────────────────────────────────────────

function fToX(f: number) {
  return (Math.log10(f / MIN_FREQ) / Math.log10(MAX_FREQ / MIN_FREQ)) * SVG_W;
}
function xToF(x: number) {
  return MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, Math.max(0, Math.min(SVG_W, x)) / SVG_W);
}
function gToY(g: number) {
  return ((MAX_GAIN - g) / (MAX_GAIN - MIN_GAIN)) * SVG_H;
}
function yToG(y: number) {
  return MAX_GAIN - (Math.max(0, Math.min(SVG_H, y)) / SVG_H) * (MAX_GAIN - MIN_GAIN);
}
function fmtFreq(f: number) {
  return f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k` : `${Math.round(f)}`;
}

// Gaussian fallback when no AudioContext yet
function gaussianPath(bands: BandState[]): string {
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * SVG_W;
    const freq = xToF(x);
    let db = 0;
    for (const b of bands) {
      if (b.gain === 0) continue;
      const oct = Math.log2(freq / b.freq);
      const sigma = 1.0 / (b.q * 1.4);
      db += b.gain * Math.exp(-(oct * oct) / (2 * sigma * sigma));
    }
    pts.push(`${x.toFixed(1)},${Math.max(0, Math.min(SVG_H, gToY(db))).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InteractiveEQ({ title, description, audioUrl }: Props) {
  const [bands, setBands] = useState<BandState[]>(() => DEFAULT_BANDS.map(b => ({ ...b })));
  const [playing, setPlaying] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dragging, setDragging] = useState<string | null>(null);
  const [curve, setCurve] = useState<string>(() => gaussianPath(DEFAULT_BANDS));

  const ctxRef     = useRef<AudioContext | null>(null);
  const filtersRef = useRef<Map<string, BiquadFilterNode>>(new Map());
  const gainNodeRef = useRef<GainNode | null>(null);
  const bufferRef  = useRef<AudioBuffer | null>(null);
  const sourceRef  = useRef<AudioBufferSourceNode | null>(null);
  const offsetRef  = useRef(0);
  const startRef   = useRef(0);
  const svgRef     = useRef<SVGSVGElement>(null);
  const loadingRef = useRef(false);

  // ── Audio context + filter chain ──────────────────────────────────────────

  function ensureCtx(): AudioContext {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const nodes = DEFAULT_BANDS.map(b => {
      const f = ctx.createBiquadFilter();
      f.type = b.type;
      f.frequency.value = b.freq;
      f.gain.value = b.gain;
      f.Q.value = b.q;
      filtersRef.current.set(b.id, f);
      return f;
    });

    const gn = ctx.createGain();
    gn.gain.value = 0.85;
    gainNodeRef.current = gn;
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    nodes[nodes.length - 1].connect(gn);
    gn.connect(ctx.destination);

    return ctx;
  }

  async function loadAudio() {
    if (!audioUrl || bufferRef.current || loadingRef.current) return;
    loadingRef.current = true;
    const ctx = ensureCtx();
    setLoadState("loading");
    try {
      const res = await fetch(audioUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ab = await res.arrayBuffer();
      bufferRef.current = await ctx.decodeAudioData(ab);
      setLoadState("ready");
    } catch (err) {
      console.error("[InteractiveEQ] load error:", err);
      setLoadState("error");
    } finally {
      loadingRef.current = false;
    }
  }

  // ── Curve ────────────────────────────────────────────────────────────────

  const computeCurve = useCallback((currentBands: BandState[]) => {
    const ctx = ctxRef.current;
    if (!ctx || filtersRef.current.size === 0) {
      setCurve(gaussianPath(currentBands));
      return;
    }
    const freqs = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      freqs[i] = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, i / (N - 1));
    }
    const sum = new Float32Array(N).fill(0);
    const mag = new Float32Array(N);
    const ph  = new Float32Array(N);
    for (const b of currentBands) {
      const filter = filtersRef.current.get(b.id);
      if (!filter) continue;
      filter.getFrequencyResponse(freqs, mag, ph);
      for (let i = 0; i < N; i++) {
        sum[i] += 20 * Math.log10(Math.max(mag[i], 1e-9));
      }
    }
    const pts = Array.from({ length: N }, (_, i) => {
      const x = ((i / (N - 1)) * SVG_W).toFixed(1);
      const y = Math.max(0, Math.min(SVG_H, gToY(sum[i]))).toFixed(1);
      return `${x},${y}`;
    });
    setCurve(`M ${pts.join(" L ")}`);
  }, []);

  // ── Apply band → filter ───────────────────────────────────────────────────

  const applyBand = useCallback((band: BandState) => {
    const filter = filtersRef.current.get(band.id);
    if (!filter || !ctxRef.current) return;
    const t = ctxRef.current.currentTime;
    filter.frequency.setTargetAtTime(band.freq, t, 0.006);
    filter.gain.setTargetAtTime(band.gain, t, 0.006);
    filter.Q.setTargetAtTime(band.q, t, 0.006);
  }, []);

  // ── Playback ──────────────────────────────────────────────────────────────

  async function togglePlay() {
    const ctx = ensureCtx();
    if (!bufferRef.current) await loadAudio();
    if (!bufferRef.current) return;
    if (ctx.state === "suspended") await ctx.resume();

    if (playing) {
      sourceRef.current?.stop();
      sourceRef.current = null;
      offsetRef.current = (ctx.currentTime - startRef.current) % bufferRef.current.duration;
      setPlaying(false);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = bufferRef.current;
      src.loop = true;
      const first = filtersRef.current.get(DEFAULT_BANDS[0].id);
      if (first) src.connect(first);
      const off = offsetRef.current % bufferRef.current.duration;
      src.start(0, off);
      startRef.current = ctx.currentTime - off;
      sourceRef.current = src;
      setPlaying(true);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function reset() {
    const fresh = DEFAULT_BANDS.map(b => ({ ...b }));
    setBands(fresh);
    for (const b of fresh) applyBand(b);
    computeCurve(fresh);
  }

  // ── Drag ─────────────────────────────────────────────────────────────────

  function svgPt(e: React.PointerEvent) {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * SVG_W,
      y: ((e.clientY - r.top) / r.height) * SVG_H,
    };
  }

  function onBandDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(id);
    ensureCtx(); // create ctx on first touch so getFrequencyResponse works immediately
  }

  function onSvgMove(e: React.PointerEvent) {
    if (!dragging) return;
    const { x, y } = svgPt(e);
    const newFreq = Math.max(25, Math.min(18000, xToF(x)));
    const newGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, yToG(y)));
    setBands(prev => {
      const next = prev.map(b => b.id === dragging ? { ...b, freq: newFreq, gain: newGain } : b);
      applyBand(next.find(b => b.id === dragging)!);
      computeCurve(next);
      return next;
    });
  }

  function onSvgUp() { setDragging(null); }

  // Cleanup
  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); ctxRef.current?.close(); } catch {}
    };
  }, []);

  const isLoading = loadState === "loading";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e", background: "#080808" }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div>
          <p className="text-sm font-semibold text-white">{title || "EQ Lab"}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {description || "Drag the band handles to shape the frequency response — hear it live"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {audioUrl && (
            <button
              onClick={togglePlay}
              disabled={isLoading || loadState === "error"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: playing ? "#1f1f1f" : "white",
                color: playing ? "white" : "black",
                border: playing ? "1px solid #333" : "none",
                opacity: isLoading || loadState === "error" ? 0.5 : 1,
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                  Loading…
                </span>
              ) : playing ? (
                <><Pause size={11} /> Stop</>
              ) : (
                <><Play size={11} /> Play</>
              )}
            </button>
          )}
          <button
            onClick={reset}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            title="Reset to flat"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* SVG */}
      <div className="px-4 pt-4 pb-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full rounded-xl"
          style={{
            background: "#0c0c0c",
            touchAction: "none",
            userSelect: "none",
            cursor: dragging ? "grabbing" : "default",
          }}
          onPointerMove={onSvgMove}
          onPointerUp={onSvgUp}
          onPointerLeave={onSvgUp}
        >
          {/* dB grid */}
          {DB_GRID.map(db => (
            <line key={db}
              x1={0} y1={gToY(db)} x2={SVG_W} y2={gToY(db)}
              stroke={db === 0 ? "#252525" : "#181818"}
              strokeWidth={db === 0 ? 1.5 : 0.8}
            />
          ))}
          {/* Freq grid */}
          {FREQ_AXIS.map(({ f }) => (
            <line key={f}
              x1={fToX(f)} y1={0} x2={fToX(f)} y2={SVG_H}
              stroke="#181818" strokeWidth={0.8}
            />
          ))}

          {/* Curve fill */}
          {curve && (
            <path
              d={`${curve} L ${SVG_W},${gToY(0)} L 0,${gToY(0)} Z`}
              fill="rgba(255,255,255,0.03)"
            />
          )}
          {/* Curve line */}
          {curve && (
            <path d={curve} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.5} />
          )}

          {/* Band handles */}
          {bands.map(b => {
            const cx = fToX(b.freq);
            const cy = gToY(b.gain);
            const active = dragging === b.id;
            return (
              <g key={b.id}>
                <line
                  x1={cx} y1={0} x2={cx} y2={SVG_H}
                  stroke={b.color}
                  strokeWidth={active ? 1 : 0.5}
                  strokeOpacity={active ? 0.4 : 0.15}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={cx} cy={cy}
                  r={active ? 9 : 7}
                  fill={b.color}
                  fillOpacity={active ? 0.95 : 0.7}
                  stroke="white"
                  strokeWidth={active ? 2 : 1.2}
                  strokeOpacity={0.5}
                  style={{ cursor: "grab" }}
                  onPointerDown={e => onBandDown(e, b.id)}
                />
              </g>
            );
          })}
        </svg>

        {/* Freq axis */}
        <div className="flex justify-between px-0.5 mt-1.5 mb-1">
          {FREQ_AXIS.filter(({ f }) => [20, 100, 500, 1000, 5000, 20000].includes(f)).map(({ f, label }) => (
            <span key={f} className="text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>{label}</span>
          ))}
        </div>
      </div>

      {/* Band cards */}
      <div className="px-4 pb-4 grid grid-cols-4 gap-2">
        {bands.map(b => (
          <div
            key={b.id}
            className="rounded-xl p-2.5 text-center transition-all duration-100"
            style={{
              background: dragging === b.id ? b.color + "14" : "#0d0d0d",
              border: `1px solid ${dragging === b.id ? b.color + "50" : "#1a1a1a"}`,
            }}
          >
            <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ background: b.color }} />
            <p className="text-xs font-semibold mb-1" style={{ color: b.color }}>{b.label}</p>
            <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>
              {fmtFreq(b.freq)} Hz
            </p>
            <p className="text-xs font-mono mt-0.5" style={{
              color: b.gain > 0.1 ? "#4ade80" : b.gain < -0.1 ? "#f87171" : "rgba(255,255,255,0.28)",
            }}>
              {b.gain >= 0 ? "+" : ""}{b.gain.toFixed(1)} dB
            </p>
          </div>
        ))}
      </div>

      {loadState === "error" && (
        <div className="px-5 pb-4 text-center">
          <p className="text-xs" style={{ color: "#f87171" }}>
            Could not load audio — the URL must be a direct audio file with CORS headers.
          </p>
        </div>
      )}
      {!audioUrl && (
        <div className="px-5 pb-4 text-center">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
            Drag the handles to explore the EQ curve — add an audio URL in the editor to hear it live
          </p>
        </div>
      )}
    </div>
  );
}
