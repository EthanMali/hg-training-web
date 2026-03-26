"use client";

// Fixed heights avoid server/client hydration mismatch
const BAR_HEIGHTS = [35, 60, 80, 50, 90, 40, 70, 55, 85, 45, 75, 65, 30, 88, 52, 68, 42, 78, 58, 38];

export default function SoundBars({ count = 20 }: { count?: number }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 64 }}>
      {BAR_HEIGHTS.slice(0, count).map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full"
          style={{
            height: `${h}%`,
            background: "rgba(255,255,255,0.12)",
            animation: "soundBar 1.4s ease-in-out infinite alternate",
            animationDelay: `${i * 0.07}s`,
            transformOrigin: "bottom",
          }}
        />
      ))}
    </div>
  );
}
