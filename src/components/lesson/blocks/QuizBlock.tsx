"use client";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ContentBlock, QuizBlockContent } from "@/types";

interface Props { block: ContentBlock; userId: string; }

type State = "idle" | "correct" | "incorrect";

export default function QuizBlock({ block, userId }: Props) {
  const content = block.content as QuizBlockContent;
  const [selected, setSelected] = useState<number | null>(null);
  const [state, setState] = useState<State>("idle");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (selected === null || state !== "idle") return;
    setSubmitting(true);
    const isCorrect = selected === content.correct_index;
    setState(isCorrect ? "correct" : "incorrect");

    const supabase = createClient();
    await supabase.from("quiz_attempts").insert({
      user_id: userId,
      content_block_id: block.id,
      selected_index: selected,
      is_correct: isCorrect,
    });
    setSubmitting(false);
  }

  return (
    <div
      className="p-6 rounded-xl space-y-4"
      style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
          ?
        </div>
        <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>Knowledge Check</span>
      </div>

      <p className="text-base font-medium text-white leading-snug">{content.question}</p>

      <div className="space-y-2">
        {content.options.map((option, idx) => {
          let style: React.CSSProperties = { border: "1px solid #1e1e1e", background: "#0a0a0a", color: "rgba(255,255,255,0.7)" };
          if (selected === idx && state === "idle") {
            style = { border: "1px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", color: "#ffffff" };
          } else if (state !== "idle" && idx === content.correct_index) {
            style = { border: "1px solid #14532d", background: "#052e16", color: "#4ade80" };
          } else if (state === "incorrect" && selected === idx) {
            style = { border: "1px solid #7f1d1d", background: "#2d0a0a", color: "#f87171" };
          }

          return (
            <button
              key={idx}
              onClick={() => state === "idle" && setSelected(idx)}
              disabled={state !== "idle"}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-150 disabled:cursor-default"
              style={style}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                style={{
                  border: `1px solid ${selected === idx && state === "idle" ? "rgba(255,255,255,0.5)" : "#2a2a2a"}`,
                  background: selected === idx && state === "idle" ? "rgba(255,255,255,0.1)" : "transparent",
                }}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              {option.text}
              {state !== "idle" && idx === content.correct_index && (
                <CheckCircle2 size={14} className="ml-auto flex-shrink-0" style={{ color: "#4ade80" }} />
              )}
              {state === "incorrect" && selected === idx && (
                <XCircle size={14} className="ml-auto flex-shrink-0" style={{ color: "#f87171" }} />
              )}
            </button>
          );
        })}
      </div>

      {state === "idle" ? (
        <button
          onClick={handleSubmit}
          disabled={selected === null || submitting}
          className="mt-2 px-5 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Checking..." : "Submit answer"}
        </button>
      ) : (
        <div
          className="flex items-start gap-3 p-4 rounded-xl animate-fade-in"
          style={state === "correct"
            ? { border: "1px solid #14532d", background: "rgba(5,46,22,0.6)" }
            : { border: "1px solid #7f1d1d", background: "rgba(45,10,10,0.6)" }}
        >
          {state === "correct" ? (
            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#4ade80" }} />
          ) : (
            <XCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#f87171" }} />
          )}
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: state === "correct" ? "#4ade80" : "#f87171" }}>
              {state === "correct" ? "Correct!" : "Not quite."}
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{content.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
