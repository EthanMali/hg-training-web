"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  title?: string;
  description?: string;
  audioUrl?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_W = 400;
const STAGE_H = 90;
const CIRCLE_R = 14;
const CIRCLE_MIN_X = CIRCLE_R + 32;
const CIRCLE_MAX_X = STAGE_W - CIRCLE_R - 32;

function panToX(pan: number): number {
  return CIRCLE_MIN_X + ((pan + 1) / 2) * (CIRCLE_MAX_X - CIRCLE_MIN_X);
}

function xToPan(x: number): number {
  const clamped = Math.max(CIRCLE_MIN_X, Math.min(CIRCLE_MAX_X, x));
  return ((clamped - CIRCLE_MIN_X) / (CIRCLE_MAX_X - CIRCLE_MIN_X)) * 2 - 1;
}

function equalPowerLR(pan: number): [number, number] {
  const angle = ((pan + 1) / 2) * (Math.PI / 2);
  return [Math.cos(angle), Math.sin(angle)];
}

// ── PannerLab ─────────────────────────────────────────────────────────────────

export default function PannerLab({ title, description, audioUrl }: Props) {
  const [pan, setPan] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [levelL, setLevelL] = useState(0);
  const [levelR, setLevelR] = useState(0);

  // Drag state
  const svgRef       = useRef<SVGSVGElement | null>(null);
  const draggingRef  = useRef(false);
  const dragStartX   = useRef(0);
  const dragStartPan = useRef(0);

  // Audio refs
  const ctxRef       = useRef<AudioContext | null>(null);
  const pannerRef    = useRef<StereoPannerNode | null>(null);
  const splitterRef  = useRef<ChannelSplitterNode | null>(null);
  const analyserLRef = useRef<AnalyserNode | null>(null);
  const analyserRRef = useRef<AnalyserNode | null>(null);
  const bufferRef    = useRef<AudioBuffer | null>(null);
  const sourceRef    = useRef<AudioBufferSourceNode | null>(null);
  const offsetRef    = useRef(0);
  const startRef     = useRef(0);
  const rafRef       = useRef(0);
  const panRef       = useRef(pan);

  useEffect(() => { panRef.current = pan; }, [pan]);

  // ── Build audio graph ──────────────────────────────────────────────────────

  function ensureCtx(): AudioContext {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new AudioContext();

    const panner = ctx.createStereoPanner();
    panner.pan.value = 0;
    pannerRef.current = panner;

    const splitter = ctx.createChannelSplitter(2);
    splitterRef.current = splitter;

    const analyserL = ctx.createAnalyser();
    analyserL.fftSize = 256;
    analyserLRef.current = analyserL;

    const analyserR = ctx.createAnalyser();
    analyserR.fftSize = 256;
    analyserRRef.current = analyserR;

    // audio output: source → panner → destination
    panner.connect(ctx.destination);
    // analysis: source → panner → splitter → analyserL / analyserR (dead end)
    panner.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);

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
      console.error("[PannerLab] load error:", err);
      setLoadState("error");
    }
  }

  // ── RAF level polling ──────────────────────────────────────────────────────

  const pollLevels = useCallback(() => {
    const aL = analyserLRef.current;
    const aR = analyserRRef.current;

    if (aL && aR && playing) {
      const bufL = new Float32Array(aL.fftSize);
      const bufR = new Float32Array(aR.fftSize);
      aL.getFloatTimeDomainData(bufL);
      aR.getFloatTimeDomainData(bufR);
      const rmsL = Math.sqrt(bufL.reduce((s, v) => s + v * v, 0) / bufL.length);
      const rmsR = Math.sqrt(bufR.reduce((s, v) => s + v * v, 0) / bufR.length);
      setLevelL(Math.min(100, rmsL * 400));
      setLevelR(Math.min(100, rmsR * 400));
    } else if (!playing) {
      // Mathematical fallback for visualizing panning without audio
      const [l, r] = equalPowerLR(panRef.current);
      setLevelL(l * 80);
      setLevelR(r * 80);
    }
    rafRef.current = requestAnimationFrame(pollLevels);
  }, [playing]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(pollLevels);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pollLevels]);

  // ── Apply pan ─────────────────────────────────────────────────────────────

  function applyPan(newPan: number) {
    const clamped = Math.max(-1, Math.min(1, newPan));
    setPan(clamped);
    panRef.current = clamped;
    const ctx = ctxRef.current;
    const panner = pannerRef.current;
    if (!ctx || !panner) return;
    panner.pan.setTargetAtTime(clamped, ctx.currentTime, 0.01);
  }

  // ── Stage drag (SVG pointer events) ───────────────────────────────────────

  function onStagePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = STAGE_W / rect.width;
    const svgX = (e.clientX - rect.left) * scaleX;
    // Only drag if clicking near the circle
    const circleX = panToX(pan);
    if (Math.abs(svgX - circleX) > CIRCLE_R + 10) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    dragStartX.current = e.clientX;
    dragStartPan.current = pan;
  }

  function onStagePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!draggingRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = STAGE_W / rect.width;
    const dx = (e.clientX - dragStartX.current) * scaleX;
    // Map pixel delta to pan delta
    const panRange = CIRCLE_MAX_X - CIRCLE_MIN_X;
    const newPan = dragStartPan.current + (dx / panRange) * 2;
    applyPan(newPan);
    // Also initialize audio context for panning without playback
    ensureCtx();
  }

  function onStagePointerUp() {
    draggingRef.current = false;
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
      src.connect(pannerRef.current!);
      const off = offsetRef.current % bufferRef.current.duration;
      src.start(0, off);
      startRef.current = ctx.currentTime - off;
      sourceRef.current = src;
      setPlaying(true);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function reset() {
    applyPan(0);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      try { sourceRef.current?.stop(); } catch {}
      try { ctxRef.current?.close(); } catch {}
    };
  }, []);

  // ── Pan display ───────────────────────────────────────────────────────────

  const panDisplay = Math.abs(pan) < 0.02
    ? "C"
    : pan < 0
    ? `L${Math.round(-pan * 50)}`
    : `R${Math.round(pan * 50)}`;

  const circleX = panToX(pan);
  const isLoading = loadState === "loading";

  // Level bar colors
  const meterColor = (pct: number) =>
    pct > 80 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#4ade80";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e", background: "#080808" }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div>
          <p className="text-sm font-semibold text-white">{title || "Stereo Panner"}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {description || "Drag the source across the stereo field — watch the L/R meters respond"}
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
            title="Reset to center"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Stage */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a1a", background: "#0c0c0c" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
            className="w-full"
            style={{ touchAction: "none", cursor: "ew-resize" }}
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
            onPointerLeave={onStagePointerUp}
          >
            {/* Stage background */}
            <rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill="transparent" />

            {/* Center line */}
            <line x1={STAGE_W / 2} y1={10} x2={STAGE_W / 2} y2={STAGE_H - 10}
              stroke="#1e1e1e" strokeWidth={1} strokeDasharray="3 3" />

            {/* Track line */}
            <line
              x1={CIRCLE_MIN_X} y1={STAGE_H / 2}
              x2={CIRCLE_MAX_X} y2={STAGE_H / 2}
              stroke="#1a1a1a" strokeWidth={2} strokeLinecap="round"
            />

            {/* L speaker */}
            <text x={14} y={STAGE_H / 2 + 4} fontSize={11} fill="rgba(255,255,255,0.25)" fontWeight="bold">L</text>
            {/* Speaker cone lines */}
            <line x1={8} y1={STAGE_H / 2 - 8} x2={24} y2={STAGE_H / 2 - 8} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            <line x1={8} y1={STAGE_H / 2 + 8} x2={24} y2={STAGE_H / 2 + 8} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

            {/* R speaker */}
            <text x={STAGE_W - 22} y={STAGE_H / 2 + 4} fontSize={11} fill="rgba(255,255,255,0.25)" fontWeight="bold">R</text>
            <line x1={STAGE_W - 24} y1={STAGE_H / 2 - 8} x2={STAGE_W - 8} y2={STAGE_H / 2 - 8} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            <line x1={STAGE_W - 24} y1={STAGE_H / 2 + 8} x2={STAGE_W - 8} y2={STAGE_H / 2 + 8} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

            {/* Source circle shadow */}
            <circle cx={circleX} cy={STAGE_H / 2} r={CIRCLE_R + 4} fill="rgba(99,102,241,0.1)" />
            {/* Source circle */}
            <circle
              cx={circleX}
              cy={STAGE_H / 2}
              r={CIRCLE_R}
              fill="#6366f1"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1.5}
              style={{ filter: "drop-shadow(0 0 6px rgba(99,102,241,0.6))" }}
            />
            {/* Source label */}
            <text
              x={circleX}
              y={STAGE_H / 2 + 4}
              textAnchor="middle"
              fontSize={9}
              fill="white"
              fontWeight="600"
            >
              SRC
            </text>

            {/* Pan value */}
            <text
              x={circleX}
              y={STAGE_H - 6}
              textAnchor="middle"
              fontSize={9}
              fill="rgba(255,255,255,0.5)"
              fontFamily="monospace"
            >
              {panDisplay}
            </text>
          </svg>
        </div>

        {/* Level meters */}
        <div className="flex gap-4 justify-center">
          {([
            { label: "L", level: levelL, color: meterColor(levelL) },
            { label: "R", level: levelR, color: meterColor(levelR) },
          ] as const).map(({ label, level, color }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
              <div
                className="relative rounded overflow-hidden"
                style={{
                  width: 28, height: 120,
                  background: "#0d0d0d",
                  border: "1px solid #1a1a1a",
                }}
              >
                {/* Meter fill */}
                <div
                  className="absolute bottom-0 left-0 right-0 transition-all rounded"
                  style={{
                    height: `${level}%`,
                    background: color,
                    transitionDuration: "40ms",
                  }}
                />
                {/* Scale marks */}
                {[25, 50, 75].map(pct => (
                  <div
                    key={pct}
                    className="absolute left-0 right-0"
                    style={{
                      bottom: `${pct}%`,
                      height: 1,
                      background: "rgba(255,255,255,0.07)",
                    }}
                  />
                ))}
              </div>
              <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                {Math.round(level)}%
              </p>
            </div>
          ))}
        </div>

        {/* Pan indicator */}
        <div className="text-center">
          <p className="text-2xl font-mono font-bold" style={{ color: "#6366f1" }}>
            {panDisplay}
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
            pan position · drag the circle above
          </p>
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
            Drag the source to change panning — add an audio URL to hear it live
          </p>
        </div>
      )}
    </div>
  );
}
