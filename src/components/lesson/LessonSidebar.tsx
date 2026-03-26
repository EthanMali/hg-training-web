"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronLeft, Menu } from "lucide-react";
import type { Lesson } from "@/types";

type PartialLesson = Pick<Lesson, "id" | "slug" | "title" | "sort_order" | "estimated_minutes">;

interface Props {
  courseSlug: string;
  courseTitle: string;
  lessons: PartialLesson[];
  currentLessonId: string;
  completedIds: string[];
}

export default function LessonSidebar({ courseSlug, courseTitle, lessons, currentLessonId, completedIds }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex-shrink-0 w-12 flex flex-col items-center pt-4 gap-4" style={{ borderRight: "1px solid #111", background: "#080808" }}>
        <button onClick={() => setCollapsed(false)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
          <Menu size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-64 flex flex-col overflow-hidden" style={{ borderRight: "1px solid #111", background: "#080808" }}>
      {/* Sidebar header */}
      <div className="h-12 flex items-center justify-between px-4 flex-shrink-0" style={{ borderBottom: "1px solid #111" }}>
        <Link href={`/courses/${courseSlug}`} className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
          {courseTitle}
        </Link>
        <button onClick={() => setCollapsed(true)} className="p-1 rounded-md hover:bg-white/5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #111" }}>
        <div className="flex items-center justify-between text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
          <span>Progress</span>
          <span>{completedIds.length}/{lessons.length}</span>
        </div>
        <div className="h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${lessons.length > 0 ? (completedIds.length / lessons.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Lessons list */}
      <div className="flex-1 overflow-y-auto py-2">
        {lessons.map((lesson, idx) => {
          const isActive = lesson.id === currentLessonId;
          const isDone = completedIds.includes(lesson.id);
          return (
            <Link
              key={lesson.id}
              href={`/courses/${courseSlug}/learn/${lesson.slug}`}
              className="flex items-center gap-3 px-4 py-3 transition-all duration-150 group"
              style={{
                background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                borderLeft: isActive ? "2px solid rgba(255,255,255,0.8)" : "2px solid transparent",
              }}
            >
              <div className="flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 size={15} style={{ color: "#4ade80" }} />
                ) : (
                  <div
                    className="w-[15px] h-[15px] rounded-full flex items-center justify-center text-[10px] font-medium"
                    style={{
                      border: `1px solid ${isActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}`,
                      color: isActive ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {idx + 1}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium truncate leading-snug"
                  style={{ color: isActive ? "#ffffff" : isDone ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.4)" }}
                >
                  {lesson.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>{lesson.estimated_minutes}m</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
