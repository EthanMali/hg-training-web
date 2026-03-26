import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, Edit2, GripVertical } from "lucide-react";
import type { Lesson } from "@/types";

export default async function AdminLessonsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("*").eq("id", id).single();
  if (!course) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", id)
    .order("sort_order");

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/courses" className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>← Courses</Link>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
        <Link href={`/admin/courses/${id}`} className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>{course.title}</Link>
      </div>
      <div className="flex items-center justify-between mb-8 mt-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Lessons</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{lessons?.length ?? 0} lessons in this course</p>
        </div>
        <Link
          href={`/admin/courses/${id}/lessons/new`}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <Plus size={14} /> New lesson
        </Link>
      </div>

      {!lessons || lessons.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ border: "1px dashed #1e1e1e" }}>
          <p className="text-white/40 mb-4">No lessons yet</p>
          <Link href={`/admin/courses/${id}/lessons/new`} className="text-sm text-white/60 hover:text-white border border-white/15 px-4 py-2 rounded-lg transition-colors">
            Create first lesson
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson: Lesson, idx: number) => (
            <div
              key={lesson.id}
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
            >
              <GripVertical size={14} style={{ color: "rgba(255,255,255,0.2)" }} className="cursor-grab flex-shrink-0" />
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={{ background: "#111", border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.4)" }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{lesson.title}</span>
                  {!lesson.is_published && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#1a1a00", color: "#fbbf24", border: "1px solid #5a4000" }}>Draft</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{lesson.estimated_minutes}m</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/admin/courses/${id}/lessons/${lesson.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.5)" }}
                >
                  <Edit2 size={11} /> Edit & blocks
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
