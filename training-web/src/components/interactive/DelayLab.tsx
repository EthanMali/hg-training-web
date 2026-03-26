"use client";
import { useRef, useState, useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import Knob from "./shared/Knob";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  title?: string;
  description?: string;
  audioUrl?: string;
}

interface DelayState {
  delayTime: number; // ms, 10 – 800
  feedback: number;  // 0 – 0.90
  mix: number;       // 0 – 1
}

const DEFAULTS: DelayState = {
  delayTime: 250,
  feedback: 0.4,
  mix: 0.5,
};

const MAX_ECHOES = 8;
const VIZ_DURATION_S = 3.0; // total time shown in SVG

// ── DelayLab ──────────────────────────────────────────────────────────────────

export default function DelayLab({ title, description, audioUrl }: Props) {
  const [params, setParams] = useState<DelayState>({ ...DEFAULTS });
  const [playing, setPlaying] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [tapBpm, setTapBpm] = useState<number | null>(null);
  const [tapFlash, setTapFlash] = useState(false);

  // Audio refs
  const ctxRef       = useRef<AudioContext | null>(null);
  const delayRef     = useRef<DelayNode | null>(null);
  const feedbackRef  = useRef<GainNode | null>(null);
  const wetGainRef   = useRef<GainNode | null>(null);
  const dryGainRef   = useRef<GainNode | null>(null);
  const inputGainRef = useRef<GainNode | null>(null);
  const bufferRef    = useRef<AudioBuffer | null>(null);
  const sourceRef    = useRef<AudioBufferSourceNode | null>(null);
  const offsetRef    = useRef(0);
  const startRef     = useRef(0);
  const paramsRef    = useRef(params);

  // Tap tempo
  const tapTimesRef  = useRef<number[]>([]);

  useEffect(() => { paramsRef.current = params; }, [params]);

  // ── Build audio graph ──────────────────────────────────────────────────────
  //
  // source → dryGain → destination
  // source → inputGain → delayNode ←⟲ feedbackGain (feedback loop)
  //                                └→ wetGain → destination

  function ensureCtx(): AudioContext {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new AudioContext();

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - DEFAULTS.mix;
    dryGainRef.current = dryGain;

    const inputGain = ctx.createGain();
    inputGain.gain.value = 1;
    inputGainRef.current = inputGain;

    const delayNode = ctx.createDelay(2.0); // max 2s
    delayNode.delayTime.value = DEFAULTS.delayTime / 1000;
    delayRef.current = delayNode;

    const feedbackGain = ctx.createGain();
    feedbackGain.gain.value = DEFAULTS.feedback;
    feedbackRef.current = feedbackGain;

    const wetGain = ctx.createGain();
    wetGain.gain.value = DEFAULTS.mix;
    wetGainRef.current = wetGain;

    // Connections
    dryGain.connect(ctx.destination);

    // Feedback loop: inputGain → delay → feedbackGain → delay (loop)
    inputGain.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode); // the loop

    // Wet output
    delayNode.connect(wetGain);
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
      console.error("[DelayLab] load error:", err);
      setLoadState("error");
    }
  }

  // ── Apply params ──────────────────────────────────────────────────────────

  function applyParams(updates: Partial<DelayState>) {
    const next = { ...paramsRef.current, ...updates };
    setParams(next);
    paramsRef.current = next;

    const ctx = ctxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;

    if (updates.delayTime !== undefined) {
      delayRef.current?.delayTime.setTargetAtTime(next.delayTime / 1000, t, 0.01);
    }
    if (updates.feedback !== undefined) {
      feedbackRef.current?.gain.setTargetAtTime(next.feedback, t, 0.01);
    }
    if (updates.mix !== undefined) {
      dryGainRef.current?.gain.setTargetAtTime(1 - next.mix, t, 0.01);
      wetGainRef.current?.gain.setTargetAtTime(next.mix, t, 0.01);
    }
  }

  // ── Tap tempo ─────────────────────────────────────────────────────────────

  function handleTap() {
    const now = performance.now();
    const taps = tapTimesRef.current;
    // Remove taps older than 3 seconds
    const recent = taps.filter(t => now - t < 3000);
    recent.push(now);
    // Keep last 4
    if (recent.length > 4) recent.shift();
    tapTimesRef.current = recent;

    // Compute average interval
    if (recent.length >= 2) {
      let totalInterval = 0;
      for (let i = 1; i < recent.length; i++) {
        totalInterval += recent[i] - recent[i - 1];
      }
      const avgMs = totalInterval / (recent.length - 1);
      const clampedMs = Math.max(10, Math.min(800, avgMs));
      const bpm = Math.round(60000 / avgMs);
      setTapBpm(bpm);
      applyParams({ delayTime: Math.round(clampedMs) });
    }

    // Flash effect
    setTapFlash(true);
    setTimeout(() => setTapFlash(false), 120);
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
      src.connect(dryGainRef.current!);
      src.connect(inputGainRef.current!);
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
    setTapBpm(null);
    tapTimesRef.current = [];
    const ctx = ctxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    delayRef.current?.delayTime.setTargetAtTime(DEFAULTS.delayTime / 1000, t, 0.01);
    feedbackRef.current?.gain.setTargetAtTime(DEFAULTS.feedback, t, 0.01);
    dryGainRef.current?.gain.setTargetAtTime(1 - DEFAULTS.mix, t, 0.01);
    wetGainRef.current?.gain.setTargetAtTime(DEFAULTS.mix, t, 0.01);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch {}
      try { ctxRef.current?.close(); } catch {}
    };
  }, []);

  // ── Echo visualization ────────────────────────────────────────────────────

  const SVG_W = 300;
  const SVG_H = 80;
  const delayS = params.delayTime / 1000;

  // Build echo bars: index 0 = direct signal, 1..N = repeats
  const echoBars: { xPct: number; height: number; opacity: number }[] = [];

  // Direct signal at t=0
  echoBars.push({ xPct: 0, height: 0.95, opacity: 0.9 });

  // Echoes
  for (let i = 1; i <= MAX_ECHOES; i++) {
    const t = delayS * i;
    if (t > VIZ_DURATION_S) break;
    const height = Math.pow(params.feedback, i);
    if (height < 0.01) break;
    echoBars.push({
      xPct: t / VIZ_DURATION_S,
      height,
      opacity: 0.2 + height * 0.8,
    });
  }

  const isLoading = loadState === "loading";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e", background: "#080808" }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div>
          <p className="text-sm font-semibold text-white">{title || "Delay Lab"}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {description || "Tap tempo delay — adjust time, feedback and mix with live echo visualization"}
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

        {/* Echo decay visualization */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a1a", background: "#0c0c0c" }}>
          <div className="px-3 pt-3 pb-1 flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Echo Decay</p>
            <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
              {params.delayTime}ms · {Math.round(params.feedback * 100)}% fb
            </p>
          </div>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
            {/* Grid lines */}
            {[1, 2, 3].map(s => {
              const x = (s / VIZ_DURATION_S) * SVG_W;
              return (
                <line key={s} x1={x} y1={0} x2={x} y2={SVG_H - 10}
                  stroke="#1a1a1a" strokeWidth={0.8} />
              );
            })}
            {/* Echo bars */}
            {echoBars.map((bar, i) => {
              const barH = bar.height * (SVG_H - 16);
              const x = bar.xPct * (SVG_W - 8) + 4;
              const isFirst = i === 0;
              return (
                <rect
                  key={i}
                  x={x - 4} y={(SVG_H - 10) - barH}
                  width={8} height={barH}
                  rx={2}
                  fill={isFirst ? "#ffffff" : "#6366f1"}
                  opacity={bar.opacity}
                />
              );
            })}
            {/* Time labels */}
            {[0, 1, 2, 3].map(s => (
              <text key={s}
                x={(s / VIZ_DURATION_S) * SVG_W + (s === 0 ? 2 : -8)}
                y={SVG_H - 1}
                fontSize={7} fill="rgba(255,255,255,0.18)"
              >
                {s}s
              </text>
            ))}
          </svg>
        </div>

        {/* Tap tempo + knobs row */}
        <div className="flex items-center gap-4">
          {/* Tap tempo button */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleTap}
              className="w-16 h-16 rounded-2xl font-bold text-sm transition-all select-none"
              style={{
                background: tapFlash ? "#6366f1" : "#141414",
                color: tapFlash ? "white" : "rgba(255,255,255,0.6)",
                border: `2px solid ${tapFlash ? "#6366f1" : "#2a2a2a"}`,
                transform: tapFlash ? "scale(0.95)" : "scale(1)",
                transitionDuration: "80ms",
              }}
            >
              TAP
            </button>
            <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
              {tapBpm !== null ? `${tapBpm} BPM` : "—"}
            </p>
          </div>

          {/* Knobs */}
          <div className="flex-1 grid grid-cols-3 gap-3 justify-items-center py-2">
            <Knob
              label="Delay Time"
              value={params.delayTime} min={10} max={800}
              display={`${Math.round(params.delayTime)}ms`}
              color="#6366f1"
              onChange={v => applyParams({ delayTime: Math.round(v) })}
            />
            <Knob
              label="Feedback"
              value={params.feedback} min={0} max={0.90}
              display={`${Math.round(params.feedback * 100)}%`}
              color="#f59e0b"
              onChange={v => applyParams({ feedback: Math.round(v * 100) / 100 })}
            />
            <Knob
              label="Mix"
              value={params.mix} min={0} max={1}
              display={`${Math.round(params.mix * 100)}%`}
              color="#10b981"
              onChange={v => applyParams({ mix: Math.round(v * 100) / 100 })}
            />
          </div>
        </div>

        {/* Param summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {([
            { key: "delayTime", label: "Delay Time", val: `${Math.round(params.delayTime)} ms`, color: "#6366f1" },
            { key: "feedback",  label: "Feedback",   val: `${Math.round(params.feedback * 100)}%`, color: "#f59e0b" },
            { key: "mix",       label: "Mix",        val: `${Math.round(params.mix * 100)}%`,       color: "#10b981" },
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
            Adjust the knobs or tap the button to set delay time — add an audio URL to hear it live
          </p>
        </div>
      )}
    </div>
  );
}
