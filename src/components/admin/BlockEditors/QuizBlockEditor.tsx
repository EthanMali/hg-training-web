"use client";
import { useState, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Input";
import type { ContentBlock, QuizBlockContent } from "@/types";

interface Props {
  block: ContentBlock;
  onUpdate: (id: string, content: Record<string, unknown>) => void;
}

export default function QuizBlockEditor({ block, onUpdate }: Props) {
  const content = block.content as QuizBlockContent;
  const [question, setQuestion] = useState(content.question);
  const [options, setOptions] = useState<{ text: string }[]>(content.options);
  const [correctIndex, setCorrectIndex] = useState(content.correct_index);
  const [explanation, setExplanation] = useState(content.explanation);

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate(block.id, { question, options, correct_index: correctIndex, explanation });
    }, 600);
    return () => clearTimeout(timer);
  }, [question, options, correctIndex, explanation, block.id, onUpdate]);

  function updateOption(idx: number, text: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { text } : o)));
  }
  function addOption() {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { text: "" }]);
  }
  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
    if (correctIndex >= idx && correctIndex > 0) setCorrectIndex((p) => p - 1);
  }

  return (
    <div className="space-y-4">
      <Textarea label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What does the HPF on the Behringer Wing do?" rows={2} />

      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
          Answer options <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>(click radio to mark correct)</span>
        </label>
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCorrectIndex(idx)}
              className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors"
              style={{
                border: `2px solid ${idx === correctIndex ? "#4ade80" : "#333"}`,
                background: idx === correctIndex ? "#052e16" : "transparent",
              }}
              title="Mark as correct answer"
            >
              {idx === correctIndex && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
            </button>
            <input
              value={opt.text}
              onChange={(e) => updateOption(idx, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              className="flex-1 h-9 px-3 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40"
              style={{ background: "var(--input-bg)", border: "1px solid var(--border)" }}
            />
            {options.length > 2 && (
              <button type="button" onClick={() => removeOption(idx)} className="p-1.5 rounded-md hover:bg-red-950 transition-colors flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button type="button" onClick={addOption} className="flex items-center gap-1.5 text-xs transition-colors mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            <Plus size={12} /> Add option
          </button>
        )}
      </div>

      <Textarea label="Explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Explain why the correct answer is right (shown after student answers)..." rows={2} />
    </div>
  );
}
