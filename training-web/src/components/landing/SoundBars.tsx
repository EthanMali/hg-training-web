"use client";
import { useEffect, useRef } from "react";

// ── Constants ──────────────────────────────────────────────────────
const N_METERS = 16;
const SEGS = 18;
const SEG_GREEN = 12;
const SEG_YELLOW = 4;
const FADER_H = 72;
const CAP_H = 14;

// ── Pre-computed deterministic sequences ───────────────────────────
const METER_SEQS: number[][] = Array.from({ length: N_METERS }, (_, ch) =>
  Array.from({ length: 24 }, (_, t) => {
    const base = 32 + (ch % 5) * 10;
    return Math.round(Math.min(97, Math.max(14, base + Math.sin((t + ch * 2.1) * 0.65) * 28)));
  })
);

// 14 channels: 8 left + 4 right + 2 master in center
const CHANNELS = [
  { name: "VOC1", base: 78 }, { name: "VOC2", base: 72 }, { name: "GTR",  base: 68 },
  { name: "BASS", base: 75 }, { name: "KCK",  base: 80 }, { name: "SNR",  base: 77 },
  { name: "HH",   base: 65 }, { name: "OH",   base: 70 },
  { name: "KEY",  base: 73 }, { name: "SYN",  base: 67 }, { name: "AUX",  base: 58 }, { name: "FX",   base: 62 },
  { name: "L",    base: 88 }, { name: "R",    base: 88 }, // master L/R in center
];

const BTN_STATES = [
  [true,  false, true ], [true,  false, false], [false, true,  false], [false, false, true ],
  [true,  true,  false], [false, true,  true ], [true,  false, false], [false, false, false],
  [false, true,  false], [true,  false, true ], [false, false, true ], [true,  true,  false],
];

function bridgeColor(s: number): { on: string; off: string } {
  if (s <= SEG_GREEN)              return { on: "#22c55e", off: "#041208" };
  if (s <= SEG_GREEN + SEG_YELLOW) return { on: "#f59e0b", off: "#100d00" };
  return                                  { on: "#ef4444", off: "#160202" };
}

function pctToTop(pct: number) {
  return (1 - pct / 100) * (FADER_H - CAP_H);
}

// ── Main component ─────────────────────────────────────────────────
export default function WingConsole3D() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const capRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const levelsRef  = useRef<number[]>(Array(N_METERS).fill(50));
  const peaksRef   = useRef<number[]>(Array(N_METERS).fill(50));
  const holdRef    = useRef<number[]>(Array(N_METERS).fill(0));
  const fLevels    = useRef(CHANNELS.map(c => c.base));
  const fTargets   = useRef(CHANNELS.map(c => c.base));
  const tick       = useRef(0);
  const raf        = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const CW = canvas.width;
    const CH = canvas.height;
    const chanW = CW / N_METERS;
    const mW = chanW - 3;
    const sH = 3;
    const sGap = 1;
    const slotH = sH + sGap;
    const seqLen = METER_SEQS[0].length;

    function frame() {
      raf.current = requestAnimationFrame(frame);
      tick.current++;

      // ── Meter bridge canvas ──
      ctx.clearRect(0, 0, CW, CH);
      for (let ch = 0; ch < N_METERS; ch++) {
        const seqI = Math.floor(tick.current / 4) % seqLen;
        const target = METER_SEQS[ch][seqI];
        levelsRef.current[ch] += (target - levelsRef.current[ch]) * 0.14;
        const level = levelsRef.current[ch];
        const litSegs = Math.round((level / 100) * SEGS);

        if (level >= peaksRef.current[ch]) {
          peaksRef.current[ch] = level;
          holdRef.current[ch] = 28;
        } else if (--holdRef.current[ch] <= 0) {
          peaksRef.current[ch] = Math.max(peaksRef.current[ch] - 1.2, level);
        }
        const peakSeg = Math.round((peaksRef.current[ch] / 100) * SEGS);

        for (let s = 1; s <= SEGS; s++) {
          const { on, off } = bridgeColor(s);
          const lit = s <= litSegs;
          const isPeak = s === peakSeg && peakSeg > litSegs;
          const y = CH - s * slotH;
          ctx.shadowColor = lit || isPeak ? on : "transparent";
          ctx.shadowBlur  = lit || isPeak ? 5 : 0;
          ctx.fillStyle   = lit || isPeak ? on : off;
          ctx.beginPath();
          ctx.roundRect(ch * chanW + 1.5, y, mW, sH, 1);
          ctx.fill();
        }
      }

      // ── Fader animation (direct DOM, no re-render) ──
      if (tick.current % 80 === 0) {
        fTargets.current = CHANNELS.map((c, i) =>
          Math.max(38, Math.min(96, c.base + Math.sin(tick.current * 0.007 + i * 1.4) * 20))
        );
      }
      capRefs.current.forEach((cap, i) => {
        if (!cap) return;
        fLevels.current[i] += (fTargets.current[i] - fLevels.current[i]) * 0.022;
        cap.style.top = `${pctToTop(fLevels.current[i])}px`;
      });
    }

    frame();
    return () => cancelAnimationFrame(raf.current);
  }, []);

  // ── Channel strip renderer ─────────────────────────────────────
  const Strip = (i: number, borderRight = true) => {
    const { name, base } = CHANNELS[i];
    const btns = BTN_STATES[i] ?? [false, false, false];

    return (
      <div key={`${name}-${i}`} style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 3, padding: "3px 2px 2px",
        borderRight: borderRight ? "1px solid #181818" : "none",
        minWidth: 26, flex: 1,
      }}>
        {/* Send/pan knob */}
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #303030, #0e0e0e)",
          border: "1px solid #242424",
        }} />
        {/* EQ / Gate / Comp buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {([["#1a7fff", btns[0]], ["#ff6200", btns[1]], ["#9900ee", btns[2]]] as [string, boolean][])
            .map(([color, active], bi) => (
              <div key={bi} style={{
                width: 14, height: 5, borderRadius: 1,
                background: active ? color : "#101010",
                border: `1px solid ${active ? color : "#1c1c1c"}`,
                boxShadow: active ? `0 0 5px ${color}99` : "none",
              }} />
          ))}
        </div>
        {/* Fader */}
        <div style={{ position: "relative", width: 10, height: FADER_H }}>
          {/* track */}
          <div style={{ position: "absolute", left: 4, top: 0, width: 2, height: FADER_H, background: "#0b0b0b", borderRadius: 1 }} />
          {/* tick marks */}
          {[0.25, 0.5, 0.75].map(t => (
            <div key={t} style={{ position: "absolute", left: 1, width: 8, height: 1, top: t * FADER_H, background: "#191919" }} />
          ))}
          {/* cap */}
          <div
            ref={el => { capRefs.current[i] = el; }}
            style={{
              position: "absolute", left: 0, top: pctToTop(base),
              width: 10, height: CAP_H,
              background: "linear-gradient(to bottom, #383838, #181818)",
              borderRadius: 2, border: "1px solid #2c2c2c",
            }}
          />
        </div>
        {/* Label */}
        <span style={{ fontSize: 5.5, color: "#282828", fontFamily: "monospace", letterSpacing: -0.2 }}>{name}</span>
      </div>
    );
  };

  const bridgeH = SEGS * (3 + 1);
  const BRIDGE_LABELS = ["VOC1","VOC2","GTR","BASS","KCK","SNR","HH","OH","KEY","SYN","AUX","FX","SUB","MON","L","R"];

  return (
    <div style={{ perspective: "900px", perspectiveOrigin: "50% 0%", display: "inline-block" }}>
      <div style={{
        transform: "rotateX(22deg) rotateY(-4deg)",
        transformOrigin: "center bottom",
        background: "linear-gradient(160deg, #141414 0%, #090909 100%)",
        border: "1px solid #1d1d1d",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 40px 100px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 40px rgba(34,197,94,0.04)",
        width: 530,
      }}>

        {/* ── Meter bridge ── */}
        <div style={{ background: "#050505", borderBottom: "1px solid #151515", padding: "5px 6px 4px" }}>
          <div style={{ display: "flex", marginBottom: 2 }}>
            {BRIDGE_LABELS.map(l => (
              <div key={l} style={{ flex: 1, textAlign: "center", fontSize: 4, color: "#202020", fontFamily: "monospace" }}>{l}</div>
            ))}
          </div>
          <canvas
            ref={canvasRef}
            width={518}
            height={bridgeH}
            style={{ display: "block", width: "100%" }}
          />
        </div>

        {/* ── Console surface ── */}
        <div style={{ display: "flex", padding: "4px 4px 6px", gap: 0 }}>

          {/* Left channels 0–7 */}
          <div style={{ display: "flex", flex: 1, borderRight: "2px solid #161616" }}>
            {Array.from({ length: 8 }, (_, i) => Strip(i, i < 7))}
          </div>

          {/* Center: screen + L/R master faders */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 4,
            padding: "3px 8px 4px", borderRight: "2px solid #161616",
            width: 82, flexShrink: 0,
          }}>
            {/* Touchscreen */}
            <div style={{
              flex: 1, borderRadius: 4, minHeight: 55,
              background: "linear-gradient(145deg, #07071a, #030310)",
              border: "1px solid #13132a",
              display: "flex", flexDirection: "column",
              justifyContent: "space-between", padding: "4px 5px",
              overflow: "hidden",
            }}>
              {/* Fake EQ display */}
              <svg viewBox="0 0 58 20" style={{ width: "100%", opacity: 0.9 }}>
                <line x1="0" y1="13" x2="58" y2="13" stroke="#0a0a22" strokeWidth="0.5" />
                <line x1="0" y1="7"  x2="58" y2="7"  stroke="#0a0a22" strokeWidth="0.5" />
                <path d="M0,13 C5,13 8,5 15,8 C22,11 25,2 29,5 C33,8 38,11 44,7 C48,3 53,10 58,10"
                  fill="none" stroke="#003d80" strokeWidth="1.5" />
                <path d="M0,13 C5,13 8,5 15,8 C22,11 25,2 29,5 C33,8 38,11 44,7 C48,3 53,10 58,10"
                  fill="none" stroke="#0066cc" strokeWidth="0.8" opacity="0.7" />
                {/* Band dots */}
                {([[15,8],[29,5],[44,7]] as [number,number][]).map(([x,y]) => (
                  <circle key={x} cx={x} cy={y} r="1.5" fill="#0088ff" opacity="0.9" />
                ))}
              </svg>
              <div style={{ textAlign: "center", fontSize: 5, color: "#003366", fontFamily: "monospace", letterSpacing: 2 }}>WING</div>
            </div>
            {/* Master L/R faders */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
              {[12, 13].map(i => {
                const { base } = CHANNELS[i];
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ position: "relative", width: 12, height: FADER_H }}>
                      <div style={{ position: "absolute", left: 5, top: 0, width: 2, height: FADER_H, background: "#0b0b0b", borderRadius: 1 }} />
                      <div
                        ref={el => { capRefs.current[i] = el; }}
                        style={{
                          position: "absolute", left: 0, top: pctToTop(base),
                          width: 12, height: CAP_H + 2,
                          background: "linear-gradient(to bottom, #484848, #1e1e1e)",
                          borderRadius: 2, border: "1px solid #383838",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 5.5, color: "#282828", fontFamily: "monospace" }}>{CHANNELS[i].name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right channels 8–11 */}
          <div style={{ display: "flex" }}>
            {Array.from({ length: 4 }, (_, i) => Strip(i + 8, i < 3))}
          </div>
        </div>

        {/* Bottom strip */}
        <div style={{
          height: 8, background: "#060606",
          borderTop: "1px solid #141414",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          {["USB", "WIFI", "MIDI", "AES"].map(l => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: l === "USB" ? "#22c55e" : l === "WIFI" ? "#0066cc" : "#1a1a1a" }} />
              <span style={{ fontSize: 4, color: "#222", fontFamily: "monospace" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
