"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import TextBlock from "./blocks/TextBlock";
import VideoBlock from "./blocks/VideoBlock";
import ImageBlock from "./blocks/ImageBlock";
import QuizBlock from "./blocks/QuizBlock";
import DiagramBlock from "./blocks/DiagramBlock";
import CalloutBlock from "./blocks/CalloutBlock";
import InteractiveBlock from "./blocks/InteractiveBlock";
import type { ContentBlock, Lesson } from "@/types";

type PartialLesson = Pick<Lesson, "id" | "slug" | "title" | "sort_order" | "estimated_minutes">;

interface Props {
  lesson: Lesson;
  blocks: ContentBlock[];
  prevLesson: PartialLesson | null;
  nextLesson: PartialLesson | null;
  courseSlug: string;
  userId: string;
  isCompleted: boolean;
}

export default function LessonViewer({ lesson, blocks, prevLesson, nextLesson, courseSlug, userId, isCompleted }: Props) {
  const [completed, setCompleted] = useState(isCompleted);
  const [marking, setMarking] = useState(false);
  const [courseComplete, setCourseComplete] = useState(false);

  async function markComplete() {
    if (completed || marking) return;
    setMarking(true);
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_id: lesson.id, course_id: lesson.course_id }),
    });
    const data = await res.json();
    setCompleted(true);
    setMarking(false);
    if (data.courseComplete) setCourseComplete(true);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Course complete celebration */}
      {courseComplete && (
        <div className="mb-8 p-6 rounded-2xl text-center animate-fade-in" style={{ border: "1px solid #14532d", background: "#052e16" }}>
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="text-lg font-bold text-white mb-1">Course Complete!</h3>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>You&apos;ve finished every lesson in this course. Great work!</p>
        </div>
      )}

      {/* Lesson title */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{lesson.title}</h1>
        {lesson.description && (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{lesson.description}</p>
        )}
      </div>

      {/* Content blocks */}
      <div className="space-y-6">
        {blocks.map((block) => {
          switch (block.block_type) {
            case "text":
              return <TextBlock key={block.id} block={block} />;
            case "video":
              return <VideoBlock key={block.id} block={block} />;
            case "image":
              return <ImageBlock key={block.id} block={block} />;
            case "quiz":
              return <QuizBlock key={block.id} block={block} userId={userId} />;
            case "diagram":
              return <DiagramBlock key={block.id} block={block} />;
            case "callout":
              return <CalloutBlock key={block.id} block={block} />;
            case "interactive":
              return <InteractiveBlock key={block.id} block={block} />;
            default:
              return null;
          }
        })}
      </div>

      {/* Lesson navigation */}
      <div className="mt-14 pt-8" style={{ borderTop: "1px solid #1a1a1a" }}>
        <div className="flex items-center justify-between gap-4">
          {prevLesson ? (
            <Link
              href={`/courses/${courseSlug}/learn/${prevLesson.slug}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{ border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.5)" }}
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline truncate max-w-[160px]">{prevLesson.title}</span>
              <span className="sm:hidden">Previous</span>
            </Link>
          ) : <div />}

          {!completed ? (
            <button
              onClick={markComplete}
              disabled={marking}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-gray-100 transition-colors disabled:opacity-60"
            >
              {marking ? "Saving..." : "Mark complete"}
              {!marking && <CheckCircle2 size={14} />}
            </button>
          ) : nextLesson ? (
            <Link
              href={`/courses/${courseSlug}/learn/${nextLesson.slug}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-gray-100 transition-colors"
            >
              Next lesson <ArrowRight size={14} />
            </Link>
          ) : (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: "#052e16", border: "1px solid #14532d", color: "#4ade80" }}>
              <CheckCircle2 size={14} /> All done!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
