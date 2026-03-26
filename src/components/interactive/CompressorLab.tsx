"use client";
import { useRef, useState, useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  title?: string;
  description?: string;
  audioUrl?: string;
}

interface CompState {
  threshold: number;  // dB  -60 → 0
  ratio: number;      //      1  → 20
  attack: number;     // sec  0.001 → 0.5
  release: number;    // sec  0.05  → 2.0
  makeup: number;     // dB   0    → 24
}

const DEFAULTS: CompState = {
  threshold: -24,
  ratio: 4,
  attack: 0.003,
  release: 0.25,
  makeup: 0,
};

// ── Knob ──────────────────────────────────────────────────────────────────────

function Knob({
  label, value, min, max, display, color, onChange,
}: {
  label: string; value: number; min: number; max: number;
  display: string; color: string; onChange: (v: number) => void;
}) {
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
  const R = 20;
  const CX = 26, CY = 26;
  const dotX = CX + R * 0.65 * Math.sin(rad);
  const dotY = CY - R * 0.65 * Math.cos(rad);

  // Arc path
  const a0 = (-135 * Math.PI) / 180;
  const a1 = rad;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const ax0 = CX + R * Math.sin(a0), ay0 = CY - R * Math.cos(a0);
  const ax1 = CX + R * Math.sin(a1), ay1 = CY - R * Math.cos(a1);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg
        width={52} height={52}
        style={{ cursor: "ns-resize", touchAction: "none", userSelect: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {/* Track */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#222" strokeWidth={3} />
        {/* Active arc */}
        {pct > 0 && (
          <path
            d={`M ${ax0},${ay0} A ${R} ${R} 0 ${large} 1 ${ax1},${ay1}`}
            fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
          />
        )}
        {/* Body */}
        <circle cx={CX} cy={CY} r={16} fill={active ? "#161616" : "#111"} stroke="#252525" strokeWidth={1} />
        {/* Indicator */}
        <circle cx={dotX} cy={dotY} r={2.5} fill={color} />
      </svg>
      <p className="text-xs font-mono font-semibold" style={{ color: active ? "white" : "rgba(255,255,255,0.55)" }}>
        {display}
      </p>
      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
    </div>
  );
}

// ── Compressor Lab ────────────────────────────────────────────────────────────

export default function CompressorLab({ title, description, audioUrl }: Props) {
  const [params, setParams] = useState<CompState>({ ...DEFAULTS });
  const [playing, setPlaying] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [grDb, setGrDb] = useState(0);

  const ctxRef    = useRef<AudioContext | null>(null);
  const compRef   = useRef<DynamicsCompressorNode | null>(null);
  const gainRef   = useRef<GainNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const offsetRef = useRef(0);
  const startRef  = useRef(0);
  const rafRef    = useRef(0);

  function ensureCtx(): AudioContext {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = params.threshold;
    comp.ratio.value = params.ratio;
    comp.attack.value = params.attack;
    comp.release.value = params.release;
    compRef.current = comp;
    const gn = ctx.createGain();
    gn.gain.value = Math.pow(10, params.makeup / 20);
    gainRef.current = gn;
    comp.connect(gn);
    gn.connect(ctx.destination);
    ctxRef.current = ctx;
    return ctx;
  }

  async function loadAudio() {
    if (!audioUrl || bufferRef.current || loadState === "loading") return;
    const ctx = ensureCtx();
    setLoadState("loading");
    try {
      const res = await fetch(audioUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ab = await res.arrayBuffer();
      bufferRef.current = await ctx.decodeAudioData(ab);
      setLoadState("ready");
    } catch (err) {
      console.error("[CompressorLab] load error:", err);
      setLoadState("error");
    }
  }

  function applyParam(updates: Partial<CompState>) {
    const next = { ...params, ...updates };
    setParams(next);
    const comp = compRef.current;
    const ctx = ctxRef.current;
    if (!comp || !ctx) return;
    const t = ctx.currentTime;
    if (updates.threshold !== undefined) comp.threshold.setTargetAtTime(updates.threshold, t, 0.01);
    if (updates.ratio     !== undefined) comp.ratio.setTargetAtTime(updates.ratio, t, 0.01);
    if (updates.attack    !== undefined) comp.attack.setTargetAtTime(updates.attack, t, 0.01);
    if (updates.release   !== undefined) comp.release.setTargetAtTime(updates.release, t, 0.01);
    if (updates.makeup    !== undefined && gainRef.current) {
      gainRef.current.gain.setTargetAtTime(Math.pow(10, updates.makeup / 20), t, 0.01);
    }
  }

  async function togglePlay() {
    const ctx = ensureCtx();
    if (!bufferRef.current) await loadAudio();
    if (!bufferRef.current) return;
    if (ctx.state === "suspended") await ctx.resume();

    if (playing) {
      sourceRef.current?.stop();
      sourceRef.current = null;
      offsetRef.current = (ctx.currentTime - startRef.current) % bufferRef.current.duration;
      cancelAnimationFrame(rafRef.current);
      setGrDb(0);
      setPlaying(false);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = bufferRef.current;
      src.loop = true;
      src.connect(compRef.current!);
      const off = offsetRef.current % bufferRef.current.duration;
      src.start(0, off);
      startRef.current = ctx.currentTime - off;
      sourceRef.current = src;
      setPlaying(true);
      const pollGR = () => {
        if (compRef.current) setGrDb(compRef.current.reduction);
        rafRef.current = requestAnimationFrame(pollGR);
      };
      pollGR();
    }
  }

  function reset() {
    setParams({ ...DEFAULTS });
    const comp = compRef.current;
    const ctx = ctxRef.current;
    if (!comp || !ctx) return;
    const t = ctx.currentTime;
    comp.threshold.setTargetAtTime(DEFAULTS.threshold, t, 0.01);
    comp.ratio.setTargetAtTime(DEFAULTS.ratio, t, 0.01);
    comp.attack.setTargetAtTime(DEFAULTS.attack, t, 0.01);
    comp.release.setTargetAtTime(DEFAULTS.release, t, 0.01);
    if (gainRef.current) gainRef.current.gain.setTargetAtTime(1, t, 0.01);
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      try { sourceRef.current?.stop(); ctxRef.current?.close(); } catch {}
    };
  }, []);

  const grPct   = Math.min(100, (Math.abs(grDb) / 20) * 100);
  const grColor = grPct > 70 ? "#ef4444" : grPct > 35 ? "#f59e0b" : "#4ade80";
  const isLoading = loadState === "loading";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e", background: "#080808" }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div>
          <p className="text-sm font-semibold text-white">{title || "Compressor Lab"}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {description || "Drag each knob up/down to adjust — hear compression in real-time"}
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
            title="Reset to defaults"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Gain reduction meter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>Gain Reduction</p>
            <p className="text-xs font-mono transition-colors" style={{ color: grDb < -0.5 ? grColor : "rgba(255,255,255,0.25)" }}>
              {grDb.toFixed(1)} dB
            </p>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${grPct}%`, background: grColor, transitionDuration: "60ms" }}
            />
          </div>
          {/* Scale */}
          <div className="flex justify-between mt-1">
            {["0", "5", "10", "15", "20+ dB"].map(l => (
              <span key={l} className="text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>{l}</span>
            ))}
          </div>
        </div>

        {/* Transfer curve (visual only) */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a1a", background: "#0c0c0c" }}>
          <svg viewBox="0 0 200 120" className="w-full">
            {/* Grid */}
            <line x1={0} y1={60} x2={200} y2={60} stroke="#1e1e1e" strokeWidth={0.8} />
            <line x1={100} y1={0} x2={100} y2={120} stroke="#1e1e1e" strokeWidth={0.8} />
            {/* 1:1 reference */}
            <line x1={0} y1={120} x2={120} y2={0} stroke="#1f1f1f" strokeWidth={1} strokeDasharray="4 4" />
            {/* Compression curve */}
            {(() => {
              const thresh = params.threshold; // -60 to 0 dB
              const ratio  = params.ratio;
              // Map dBFS input (-60..0) to x coordinate (0..200)
              // Map dBFS output (-60..0) to y coordinate (120..0)
              const points: string[] = [];
              for (let i = 0; i <= 100; i++) {
                const inDb  = -60 + i * 0.6; // -60 to 0
                const outDb = inDb <= thresh
                  ? inDb
                  : thresh + (inDb - thresh) / ratio;
                const px = ((inDb + 60) / 60) * 200;
                const py = 120 - ((outDb + 60) / 60) * 120;
                points.push(`${px.toFixed(1)},${Math.max(0, Math.min(120, py)).toFixed(1)}`);
              }
              return (
                <path
                  d={`M ${points.join(" L ")}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth={1.5}
                />
              );
            })()}
            {/* Threshold indicator */}
            {(() => {
              const tx = ((params.threshold + 60) / 60) * 200;
              return <line x1={tx} y1={0} x2={tx} y2={120} stroke="#6366f1" strokeWidth={0.8} strokeOpacity={0.5} strokeDasharray="3 2" />;
            })()}
            {/* Labels */}
            <text x={4} y={116} fontSize={8} fill="rgba(255,255,255,0.2)">−60</text>
            <text x={180} y={116} fontSize={8} fill="rgba(255,255,255,0.2)">0 dB</text>
            <text x={4} y={10} fontSize={8} fill="rgba(255,255,255,0.2)">OUT</text>
          </svg>
        </div>

        {/* Knobs */}
        <div className="grid grid-cols-5 gap-3 justify-items-center py-2">
          <Knob
            label="Threshold" value={params.threshold} min={-60} max={0}
            display={`${Math.round(params.threshold)} dB`} color="#6366f1"
            onChange={v => applyParam({ threshold: Math.round(v) })}
          />
          <Knob
            label="Ratio" value={params.ratio} min={1} max={20}
            display={`${params.ratio.toFixed(1)}:1`} color="#f59e0b"
            onChange={v => applyParam({ ratio: v })}
          />
          <Knob
            label="Attack" value={params.attack} min={0.001} max={0.5}
            display={params.attack < 0.01 ? `${(params.attack * 1000).toFixed(1)}ms` : `${(params.attack * 1000).toFixed(0)}ms`}
            color="#10b981"
            onChange={v => applyParam({ attack: v })}
          />
          <Knob
            label="Release" value={params.release} min={0.05} max={2.0}
            display={`${(params.release * 1000).toFixed(0)}ms`} color="#0ea5e9"
            onChange={v => applyParam({ release: v })}
          />
          <Knob
            label="Makeup" value={params.makeup} min={0} max={24}
            display={`+${params.makeup.toFixed(1)}dB`} color="#ec4899"
            onChange={v => applyParam({ makeup: v })}
          />
        </div>

        {/* Param summary */}
        <div className="grid grid-cols-5 gap-2 text-center">
          {([
            { key: "threshold", label: "Threshold", val: `${Math.round(params.threshold)} dB`, color: "#6366f1" },
            { key: "ratio",     label: "Ratio",     val: `${params.ratio.toFixed(1)}:1`,        color: "#f59e0b" },
            { key: "attack",    label: "Attack",    val: `${(params.attack * 1000).toFixed(1)} ms`, color: "#10b981" },
            { key: "release",   label: "Release",   val: `${(params.release * 1000).toFixed(0)} ms`, color: "#0ea5e9" },
            { key: "makeup",    label: "Makeup",    val: `+${params.makeup.toFixed(1)} dB`,      color: "#ec4899" },
          ] as const).map(item => (
            <div key={item.key} className="rounded-lg p-2" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
              <p className="text-xs font-mono font-semibold" style={{ color: item.color }}>{item.val}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {loadState === "error" && (
        <div className="px-5 pb-4 text-center">
          <p className="text-xs" style={{ color: "#f87171" }}>
            Could not load audio — the URL must be a direct audio file with CORS headers.
          </p>
        </div>
      )}
      {!audioUrl && (
        <div className="px-5 pb-5 text-center">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
            Adjust the knobs to see the transfer curve change — add an audio URL to hear compression live
          </p>
        </div>
      )}
    </div>
  );
}
