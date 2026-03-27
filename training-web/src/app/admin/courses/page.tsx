import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Badge from "@/components/ui/Badge";
import { Plus, Edit2, BookOpen, FileJson } from "lucide-react";
import type { Course } from "@/types";

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order");

  // Lesson counts
  const courseIds = courses?.map((c: Course) => c.id) ?? [];
  const { data: lessonRows } = courseIds.length > 0
    ? await supabase.from("lessons").select("course_id").in("course_id", courseIds)
    : { data: [] };

  function getLessonCount(id: string) {
    return lessonRows?.filter((l: { course_id: string }) => l.course_id === id).length ?? 0;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Courses</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{courses?.length ?? 0} courses total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/courses/import"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.6)", background: "#0a0a0a" }}
          >
            <FileJson size={14} /> Import JSON
          </Link>
          <Link
            href="/admin/courses/new"
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            <Plus size={14} /> New course
          </Link>
        </div>
      </div>

      {!courses || courses.length === 0 ? (
        <div className="text-center py-20 rounded-xl" style={{ border: "1px dashed #1e1e1e" }}>
          <BookOpen size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-white/40 mb-4">No courses yet</p>
          <Link href="/admin/courses/new" className="text-sm text-white/60 hover:text-white border border-white/15 px-4 py-2 rounded-lg transition-colors">
            Create your first course
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map((course: Course) => (
            <div
              key={course.id}
              className="flex items-center gap-4 p-4 rounded-xl transition-colors"
              style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">{course.title}</span>
                  {!course.is_published && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#1a1a00", color: "#fbbf24", border: "1px solid #5a4000" }}>Draft</span>
                  )}
                  {course.is_published && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#052e16", color: "#4ade80", border: "1px solid #14532d" }}>Published</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <Badge variant={course.difficulty as "beginner" | "intermediate" | "advanced"}>{course.difficulty}</Badge>
                  <span>{getLessonCount(course.id)} lessons</span>
                  <span>{course.estimated_minutes}m</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/admin/courses/${course.id}/lessons`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.5)" }}
                >
                  <BookOpen size={12} /> Lessons
                </Link>
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.5)" }}
                >
                  <Edit2 size={12} /> Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
