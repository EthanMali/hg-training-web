"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Radio } from "lucide-react";
import Knob from "./shared/Knob";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  title?: string;
  description?: string;
  audioUrl?: string;
}

interface ReverbState {
  roomSize: number; // seconds 0.2 – 5.0
  preDelay: number; // ms 0 – 100
  decay: number;    // 1 – 12
  mix: number;      // 0 – 1
}

const DEFAULTS: ReverbState = {
  roomSize: 1.5,
  preDelay: 20,
  decay: 4,
  mix: 0.35,
};

// ── IR generation ─────────────────────────────────────────────────────────────

function makeIR(ctx: AudioContext, roomSizeSec: number, decay: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * roomSizeSec);
  const buf = ctx.createBuffer(2, Math.max(len, 100), sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-(i / sr) * decay);
    }
  }
  return buf;
}

// ── ReverbLab ─────────────────────────────────────────────────────────────────

export default function ReverbLab({ title, description, audioUrl }: Props) {
  const [params, setParams] = useState<ReverbState>({ ...DEFAULTS });
  const [playing, setPlaying] = useState(false);
  const [bypassed, setBypassed] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // Audio refs
  const ctxRef        = useRef<AudioContext | null>(null);
  const convolverRef  = useRef<ConvolverNode | null>(null);
  const preDelayRef   = useRef<DelayNode | null>(null);
  const wetGainRef    = useRef<GainNode | null>(null);
  const dryGainRef    = useRef<GainNode | null>(null);
  const bufferRef     = useRef<AudioBuffer | null>(null);
  const sourceRef     = useRef<AudioBufferSourceNode | null>(null);
  const offsetRef     = useRef(0);
  const startRef      = useRef(0);
  const paramsRef     = useRef(params);

  useEffect(() => { paramsRef.current = params; }, [params]);

  // ── Build audio graph ──────────────────────────────────────────────────────

  function ensureCtx(): AudioContext {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new AudioContext();

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - DEFAULTS.mix;
    dryGainRef.current = dryGain;

    const wetGain = ctx.createGain();
    wetGain.gain.value = DEFAULTS.mix;
    wetGainRef.current = wetGain;

    const preDelay = ctx.createDelay(0.2);
    preDelay.delayTime.value = DEFAULTS.preDelay / 1000;
    preDelayRef.current = preDelay;

    const convolver = ctx.createConvolver();
    convolver.buffer = makeIR(ctx, DEFAULTS.roomSize, DEFAULTS.decay);
    convolverRef.current = convolver;

    // dry path: will be connected per source
    dryGain.connect(ctx.destination);
    // wet path: preDelay → convolver → wetGain → dest
    preDelay.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(ctx.destination);

    ctxRef.current = ctx;
    return ctx;
  }

  // ── Load audio ────────────────────────────────────────────────────────────

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
      console.error("[ReverbLab] load error:", err);
      setLoadState("error");
    }
  }

  // ── Rebuild IR when roomSize or decay change ───────────────────────────────

  const rebuildIR = useCallback((roomSize: number, decay: number) => {
    const ctx = ctxRef.current;
    const conv = convolverRef.current;
    if (!ctx || !conv) return;
    conv.buffer = makeIR(ctx, roomSize, decay);
  }, []);

  // ── Apply params ──────────────────────────────────────────────────────────

  function applyParams(updates: Partial<ReverbState>) {
    const next = { ...paramsRef.current, ...updates };
    setParams(next);
    paramsRef.current = next;

    const ctx = ctxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;

    if (updates.mix !== undefined) {
      const isBypassed = bypassed;
      if (!isBypassed) {
        dryGainRef.current?.gain.setTargetAtTime(1 - next.mix, t, 0.02);
        wetGainRef.current?.gain.setTargetAtTime(next.mix, t, 0.02);
      }
    }
    if (updates.preDelay !== undefined) {
      preDelayRef.current?.delayTime.setTargetAtTime(next.preDelay / 1000, t, 0.02);
    }
    if (updates.roomSize !== undefined || updates.decay !== undefined) {
      rebuildIR(next.roomSize, next.decay);
    }
  }

  // ── Toggle bypass ─────────────────────────────────────────────────────────

  function toggleBypass() {
    const ctx = ctxRef.current;
    const next = !bypassed;
    setBypassed(next);
    if (!ctx) return;
    const t = ctx.currentTime;
    if (next) {
      // Bypassed: full dry, no wet
      dryGainRef.current?.gain.setTargetAtTime(1, t, 0.02);
      wetGainRef.current?.gain.setTargetAtTime(0, t, 0.02);
    } else {
      const p = paramsRef.current;
      dryGainRef.current?.gain.setTargetAtTime(1 - p.mix, t, 0.02);
      wetGainRef.current?.gain.setTargetAtTime(p.mix, t, 0.02);
    }
  }

  // ── Toggle play ───────────────────────────────────────────────────────────

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
      // Connect source to both dry and preDelay (wet) paths
      src.connect(dryGainRef.current!);
      src.connect(preDelayRef.current!);
      const off = offsetRef.current % bufferRef.current.duration;
      src.start(0, off);
      startRef.current = ctx.currentTime - off;
      sourceRef.current = src;
      setPlaying(true);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function reset() {
    const next = { ...DEFAULTS };
    setParams(next);
    paramsRef.current = next;
    setBypassed(false);
    const ctx = ctxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    dryGainRef.current?.gain.setTargetAtTime(1 - DEFAULTS.mix, t, 0.02);
    wetGainRef.current?.gain.setTargetAtTime(DEFAULTS.mix, t, 0.02);
    preDelayRef.current?.delayTime.setTargetAtTime(DEFAULTS.preDelay / 1000, t, 0.02);
    rebuildIR(DEFAULTS.roomSize, DEFAULTS.decay);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch {}
      try { ctxRef.current?.close(); } catch {}
    };
  }, []);

  // ── Reverb tail visualization ──────────────────────────────────────────────

  const BAR_COUNT = 20;
  const tailBars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const t = (i / (BAR_COUNT - 1)) * params.roomSize;
    const height = Math.exp(-t * params.decay / params.roomSize) * 100;
    return Math.max(2, height);
  });

  const isLoading = loadState === "loading";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e", background: "#080808" }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div>
          <p className="text-sm font-semibold text-white">{title || "Reverb Lab"}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {description || "Adjust room size, pre-delay, decay and mix — hear the reverb tail change in real time"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bypass toggle */}
          <button
            onClick={toggleBypass}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: bypassed ? "#1a0a0a" : "#0a1a0a",
              color: bypassed ? "#ef4444" : "#4ade80",
              border: `1px solid ${bypassed ? "#3a1a1a" : "#1a3a1a"}`,
            }}
          >
            <Radio size={10} />
            {bypassed ? "Bypassed" : "Active"}
          </button>

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

        {/* Reverb tail visualization */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a1a", background: "#0c0c0c" }}>
          <div className="px-3 pt-3 pb-1 flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Reverb Tail</p>
            <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
              {params.roomSize.toFixed(1)}s room · decay {params.decay.toFixed(1)}
            </p>
          </div>
          <svg viewBox="0 0 200 60" className="w-full" style={{ opacity: bypassed ? 0.25 : 1 }}>
            {tailBars.map((h, i) => {
              const x = 4 + (i / BAR_COUNT) * 192;
              const barH = (h / 100) * 48;
              const opacity = 0.15 + (h / 100) * 0.85;
              return (
                <rect
                  key={i}
                  x={x} y={56 - barH}
                  width={7} height={barH}
                  rx={1.5}
                  fill="#6366f1"
                  opacity={opacity}
                />
              );
            })}
            {/* Pre-delay marker */}
            {params.preDelay > 0 && (() => {
              const px = 4 + (params.preDelay / 1000 / params.roomSize) * 192;
              return (
                <line
                  x1={Math.min(px, 196)} y1={0}
                  x2={Math.min(px, 196)} y2={56}
                  stroke="#f59e0b" strokeWidth={0.8}
                  strokeOpacity={0.5} strokeDasharray="2 2"
                />
              );
            })()}
            <text x={4} y={59} fontSize={7} fill="rgba(255,255,255,0.18)">0ms</text>
            <text x={175} y={59} fontSize={7} fill="rgba(255,255,255,0.18)">{(params.roomSize * 1000).toFixed(0)}ms</text>
          </svg>
        </div>

        {/* Knobs */}
        <div className="grid grid-cols-4 gap-3 justify-items-center py-2">
          <Knob
            label="Room Size"
            value={params.roomSize} min={0.2} max={5.0}
            display={`${params.roomSize.toFixed(1)}s`}
            color="#6366f1"
            onChange={v => applyParams({ roomSize: Math.round(v * 10) / 10 })}
          />
          <Knob
            label="Pre-delay"
            value={params.preDelay} min={0} max={100}
            display={`${Math.round(params.preDelay)}ms`}
            color="#f59e0b"
            onChange={v => applyParams({ preDelay: Math.round(v) })}
          />
          <Knob
            label="Decay"
            value={params.decay} min={1} max={12}
            display={params.decay.toFixed(1)}
            color="#10b981"
            onChange={v => applyParams({ decay: Math.round(v * 10) / 10 })}
          />
          <Knob
            label="Mix"
            value={params.mix} min={0} max={1}
            display={`${Math.round(params.mix * 100)}%`}
            color="#0ea5e9"
            onChange={v => applyParams({ mix: Math.round(v * 100) / 100 })}
          />
        </div>

        {/* Param summary */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {([
            { key: "roomSize", label: "Room Size", val: `${params.roomSize.toFixed(1)} s`,         color: "#6366f1" },
            { key: "preDelay", label: "Pre-delay",  val: `${Math.round(params.preDelay)} ms`,       color: "#f59e0b" },
            { key: "decay",    label: "Decay",      val: params.decay.toFixed(1),                   color: "#10b981" },
            { key: "mix",      label: "Mix",         val: `${Math.round(params.mix * 100)}%`,        color: "#0ea5e9" },
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
            Adjust the knobs to see the reverb tail change — add an audio URL to hear it live
          </p>
        </div>
      )}
    </div>
  );
}
