"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import Knob from "./shared/Knob";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  title?: string;
  description?: string;
  audioUrl?: string;
}

interface GateState {
  threshold: number; // dB, -60 to 0
  attack: number;    // sec, 0.001 – 0.1
  release: number;   // sec, 0.01 – 1.0
  range: number;     // dB attenuation when closed, 0 to -80
}

const DEFAULTS: GateState = {
  threshold: -30,
  attack: 0.005,
  release: 0.1,
  range: -60,
};

// ── Meter SVG constants ────────────────────────────────────────────────────────

const METER_SVG_W = 60;
const METER_SVG_H = 200;
const METER_TOP_PAD = 10;
const METER_BOT_PAD = 20;
const METER_TRACK_H = METER_SVG_H - METER_TOP_PAD - METER_BOT_PAD;
const DB_MIN = -60;
const DB_MAX = 0;

function dbToY(db: number): number {
  const pct = (db - DB_MAX) / (DB_MIN - DB_MAX); // 0 at top, 1 at bottom
  return METER_TOP_PAD + pct * METER_TRACK_H;
}

function dbToBarPct(db: number): number {
  return Math.max(0, Math.min(1, (db - DB_MIN) / (DB_MAX - DB_MIN)));
}

// ── GateLab ───────────────────────────────────────────────────────────────────

export default function GateLab({ title, description, audioUrl }: Props) {
  const [params, setParams] = useState<GateState>({ ...DEFAULTS });
  const [playing, setPlaying] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [gateOpen, setGateOpen] = useState(false);
  const [inputDb, setInputDb] = useState(-60);

  // Audio refs
  const ctxRef         = useRef<AudioContext | null>(null);
  const inputAnalyser  = useRef<AnalyserNode | null>(null);
  const gateGainRef    = useRef<GainNode | null>(null);
  const bufferRef      = useRef<AudioBuffer | null>(null);
  const sourceRef      = useRef<AudioBufferSourceNode | null>(null);
  const offsetRef      = useRef(0);
  const startRef       = useRef(0);
  const rafRef         = useRef(0);
  const wasOpenRef     = useRef(false);
  const paramsRef      = useRef(params);

  useEffect(() => { paramsRef.current = params; }, [params]);

  // Threshold drag state (SVG)
  const meterSvgRef        = useRef<SVGSVGElement | null>(null);
  const draggingThreshold  = useRef(false);

  // ── Build audio graph ──────────────────────────────────────────────────────
  //
  // source → inputAnalyser → gateGain → destination

  function ensureCtx(): AudioContext {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new AudioContext();

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    inputAnalyser.current = analyser;

    const gateGain = ctx.createGain();
    gateGain.gain.value = 1.0;
    gateGainRef.current = gateGain;

    // source → analyser → gateGain → destination
    analyser.connect(gateGain);
    gateGain.connect(ctx.destination);

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
      console.error("[GateLab] load error:", err);
      setLoadState("error");
    }
  }

  // ── Gate logic RAF ────────────────────────────────────────────────────────

  const runGateLogic = useCallback(() => {
    const ctx = ctxRef.current;
    const analyser = inputAnalyser.current;
    const gateGain = gateGainRef.current;

    if (!ctx || !analyser || !gateGain) {
      rafRef.current = requestAnimationFrame(runGateLogic);
      return;
    }

    const p = paramsRef.current;
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const rms = Math.sqrt(buffer.reduce((s, v) => s + v * v, 0) / buffer.length);
    const db = 20 * Math.log10(Math.max(rms, 1e-9));
    setInputDb(db);

    const isOpen = db > p.threshold;
    if (isOpen !== wasOpenRef.current) {
      if (isOpen) {
        // Attack: open gate quickly
        gateGain.gain.setTargetAtTime(1.0, ctx.currentTime, p.attack);
      } else {
        // Release: close gate to range
        const rangeLinear = Math.pow(10, p.range / 20);
        gateGain.gain.setTargetAtTime(rangeLinear, ctx.currentTime, p.release);
      }
      wasOpenRef.current = isOpen;
      setGateOpen(isOpen);
    }

    rafRef.current = requestAnimationFrame(runGateLogic);
  }, []);

  // ── Apply params ──────────────────────────────────────────────────────────

  function applyParams(updates: Partial<GateState>) {
    const next = { ...paramsRef.current, ...updates };
    setParams(next);
    paramsRef.current = next;
    // Gate responds on next RAF cycle — no immediate node param changes needed
    // (threshold/attack/release/range are read each RAF frame)
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
      src.connect(inputAnalyser.current!);
      const off = offsetRef.current % bufferRef.current.duration;
      src.start(0, off);
      startRef.current = ctx.currentTime - off;
      sourceRef.current = src;
      setPlaying(true);
    }
  }

  // ── Start/stop RAF ────────────────────────────────────────────────────────

  useEffect(() => {
    rafRef.current = requestAnimationFrame(runGateLogic);
    return () => cancelAnimationFrame(rafRef.current);
  }, [runGateLogic]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  function reset() {
    const next = { ...DEFAULTS };
    setParams(next);
    paramsRef.current = next;
    const ctx = ctxRef.current;
    const gateGain = gateGainRef.current;
    if (!ctx || !gateGain) return;
    gateGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.01);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      try { sourceRef.current?.stop(); } catch {}
      try { ctxRef.current?.close(); } catch {}
    };
  }, []);

  // ── Threshold drag (SVG pointer events) ───────────────────────────────────

  function onMeterPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const svg = meterSvgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleY = METER_SVG_H / rect.height;
    const svgY = (e.clientY - rect.top) * scaleY;
    const threshY = dbToY(params.threshold);
    // Only grab if near the threshold line
    if (Math.abs(svgY - threshY) > 12) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingThreshold.current = true;
  }

  function onMeterPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!draggingThreshold.current) return;
    const svg = meterSvgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleY = METER_SVG_H / rect.height;
    const svgY = (e.clientY - rect.top) * scaleY;
    // Convert Y to dB
    const pct = Math.max(0, Math.min(1, (svgY - METER_TOP_PAD) / METER_TRACK_H));
    const db = DB_MAX + pct * (DB_MIN - DB_MAX);
    applyParams({ threshold: Math.round(Math.max(DB_MIN, Math.min(DB_MAX, db))) });
  }

  function onMeterPointerUp() {
    draggingThreshold.current = false;
  }

  const isLoading = loadState === "loading";
  const levelPct = dbToBarPct(inputDb) * 100;
  const levelColor = inputDb > -6 ? "#ef4444" : inputDb > -18 ? "#f59e0b" : "#4ade80";
  const threshY = dbToY(params.threshold);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e", background: "#080808" }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div>
          <p className="text-sm font-semibold text-white">{title || "Noise Gate"}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {description || "Drag the threshold line or use knobs — gate opens when input exceeds threshold"}
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

        {/* Main layout: meter + knobs */}
        <div className="flex gap-5">

          {/* Level meter with draggable threshold */}
          <div className="flex-shrink-0">
            <p className="text-xs font-medium mb-2 text-center" style={{ color: "rgba(255,255,255,0.35)" }}>Level</p>
            <svg
              ref={meterSvgRef}
              width={METER_SVG_W} height={METER_SVG_H}
              style={{ cursor: "ns-resize", touchAction: "none", display: "block" }}
              onPointerDown={onMeterPointerDown}
              onPointerMove={onMeterPointerMove}
              onPointerUp={onMeterPointerUp}
              onPointerLeave={onMeterPointerUp}
            >
              {/* Meter background track */}
              <rect
                x={12} y={METER_TOP_PAD}
                width={20} height={METER_TRACK_H}
                rx={3} fill="#0d0d0d" stroke="#1a1a1a" strokeWidth={1}
              />

              {/* Level fill */}
              {(() => {
                const fillH = (levelPct / 100) * METER_TRACK_H;
                return (
                  <rect
                    x={12}
                    y={METER_TOP_PAD + METER_TRACK_H - fillH}
                    width={20} height={fillH}
                    rx={2}
                    fill={levelColor}
                    style={{ transition: "height 40ms, y 40ms" }}
                  />
                );
              })()}

              {/* dB scale marks */}
              {[-60, -48, -36, -24, -18, -12, -6, 0].map(db => {
                const y = dbToY(db);
                const isZero = db === 0;
                return (
                  <g key={db}>
                    <line x1={8} y1={y} x2={12} y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                    <text
                      x={36} y={y + 3}
                      fontSize={6.5}
                      fill={isZero ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)"}
                      fontFamily="monospace"
                    >
                      {db}
                    </text>
                  </g>
                );
              })}

              {/* Threshold line (draggable) */}
              <line
                x1={6} y1={threshY}
                x2={38} y2={threshY}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeLinecap="round"
                style={{ cursor: "ns-resize", filter: "drop-shadow(0 0 3px rgba(245,158,11,0.7))" }}
              />
              {/* Threshold handle */}
              <circle
                cx={44} cy={threshY}
                r={5}
                fill="#f59e0b"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth={1}
                style={{ cursor: "ns-resize" }}
              />
              {/* Threshold label */}
              <text
                x={50} y={threshY - 3}
                fontSize={6} fill="#f59e0b"
                fontFamily="monospace"
              >
                {params.threshold}
              </text>
              <text
                x={50} y={threshY + 6}
                fontSize={5.5} fill="rgba(245,158,11,0.6)"
                fontFamily="monospace"
              >
                dB
              </text>
            </svg>
          </div>

          {/* Right side: gate status + knobs */}
          <div className="flex-1 flex flex-col gap-4">

            {/* Gate open/closed badge */}
            <div className="flex items-center justify-center">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{
                  background: gateOpen ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${gateOpen ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: gateOpen ? "#4ade80" : "#ef4444",
                    boxShadow: gateOpen ? "0 0 6px #4ade80" : "0 0 6px #ef4444",
                  }}
                />
                <p className="text-sm font-semibold" style={{ color: gateOpen ? "#4ade80" : "#ef4444" }}>
                  {gateOpen ? "GATE OPEN" : "GATE CLOSED"}
                </p>
              </div>
            </div>

            {/* Input dB display */}
            <div className="text-center rounded-lg py-2" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
              <p className="text-xl font-mono font-bold" style={{ color: levelColor }}>
                {inputDb > -60 ? `${inputDb.toFixed(1)} dB` : "< −60 dB"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>input level</p>
            </div>

            {/* Knobs */}
            <div className="grid grid-cols-2 gap-3 justify-items-center py-1">
              <Knob
                label="Threshold"
                value={params.threshold} min={-60} max={0}
                display={`${Math.round(params.threshold)} dB`}
                color="#f59e0b"
                onChange={v => applyParams({ threshold: Math.round(v) })}
              />
              <Knob
                label="Attack"
                value={params.attack} min={0.001} max={0.1}
                display={`${(params.attack * 1000).toFixed(1)}ms`}
                color="#10b981"
                onChange={v => applyParams({ attack: Math.max(0.001, Math.min(0.1, v)) })}
              />
              <Knob
                label="Release"
                value={params.release} min={0.01} max={1.0}
                display={`${(params.release * 1000).toFixed(0)}ms`}
                color="#0ea5e9"
                onChange={v => applyParams({ release: Math.max(0.01, Math.min(1.0, v)) })}
              />
              <Knob
                label="Range"
                value={params.range} min={-80} max={0}
                display={`${Math.round(params.range)} dB`}
                color="#8b5cf6"
                onChange={v => applyParams({ range: Math.round(v) })}
              />
            </div>
          </div>
        </div>

        {/* Param summary */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {([
            { key: "threshold", label: "Threshold", val: `${Math.round(params.threshold)} dB`,          color: "#f59e0b" },
            { key: "attack",    label: "Attack",    val: `${(params.attack * 1000).toFixed(1)} ms`,      color: "#10b981" },
            { key: "release",   label: "Release",   val: `${(params.release * 1000).toFixed(0)} ms`,     color: "#0ea5e9" },
            { key: "range",     label: "Range",     val: `${Math.round(params.range)} dB`,               color: "#8b5cf6" },
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
            Drag the threshold line up/down on the meter — add an audio URL to hear gating live
          </p>
        </div>
      )}
    </div>
  );
}
