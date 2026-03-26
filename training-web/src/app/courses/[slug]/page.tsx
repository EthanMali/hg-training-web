import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import { ArrowRight, Clock, BookOpen, CheckCircle2, Lock } from "lucide-react";
import type { Course, Lesson } from "@/types";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!course) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", course.id)
    .eq("is_published", true)
    .order("sort_order");

  // Check enrollment
  let enrollment = null;
  let progressData: { lesson_id: string; completed: boolean }[] = [];
  if (user) {
    const { data: e } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .single();
    enrollment = e;

    if (lessons?.length) {
      const { data: p } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user.id)
        .eq("course_id", course.id);
      progressData = p ?? [];
    }
  }

  const totalLessons = lessons?.length ?? 0;
  const completedCount = progressData.filter((p) => p.completed).length;
  const progressPct = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

  function isCompleted(lessonId: string) {
    return progressData.some((p) => p.lesson_id === lessonId && p.completed);
  }

  // Find first incomplete lesson
  const firstIncomplete = lessons?.find((l: Lesson) => !isCompleted(l.id));
  const continueLesson = firstIncomplete || lessons?.[0];

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Course Hero */}
        <div className="border-b" style={{ borderColor: "#111" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Link href="/courses" className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Courses</Link>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{course.title}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={(course as Course).difficulty as "beginner" | "intermediate" | "advanced"}>
                    {(course as Course).difficulty}
                  </Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{course.title}</h1>
                {course.description && (
                  <p className="text-base leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>{course.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <span className="flex items-center gap-1.5"><Clock size={14} /> {course.estimated_minutes}m</span>
                  <span className="flex items-center gap-1.5"><BookOpen size={14} /> {totalLessons} lessons</span>
                  {enrollment && (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 size={14} /> Enrolled
                    </span>
                  )}
                </div>
              </div>

              {/* Sticky CTA card */}
              <div className="lg:w-72 flex-shrink-0">
                <div className="rounded-xl p-6 sticky top-20" style={{ border: "1px solid #1e1e1e", background: "#0f0f0f" }}>
                  {enrollment ? (
                    <>
                      <div className="mb-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          <span>Progress</span>
                          <span>{completedCount}/{totalLessons}</span>
                        </div>
                        <Progress value={progressPct} size="sm" />
                      </div>
                      {continueLesson && (
                        <Link
                          href={`/courses/${slug}/learn/${continueLesson.slug}`}
                          className="flex items-center justify-center gap-2 w-full h-11 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
                        >
                          {completedCount > 0 ? "Continue" : "Start"} <ArrowRight size={15} />
                        </Link>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
                        <Lock size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                      </div>
                      <p className="text-sm font-medium text-white mb-1">Not assigned</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Contact an admin to get access to this course.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lesson list */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h2 className="text-lg font-semibold text-white mb-6">Lessons</h2>
          {!lessons || lessons.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.3)" }}>No lessons available yet.</p>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson: Lesson, idx: number) => {
                const done = isCompleted(lesson.id);
                const accessible = !!enrollment;
                return (
                  <div key={lesson.id}>
                    {accessible ? (
                      <Link
                        href={`/courses/${slug}/learn/${lesson.slug}`}
                        className="flex items-center gap-4 p-4 rounded-xl transition-all duration-150 group"
                        style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                          style={done ? { background: "#052e16", border: "1px solid #14532d", color: "#4ade80" } : { background: "#111", border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.4)" }}
                        >
                          {done ? <CheckCircle2 size={14} /> : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{lesson.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{lesson.estimated_minutes}m</span>
                          <ArrowRight size={13} style={{ color: "rgba(255,255,255,0.2)" }} className="group-hover:text-white/60 transition-colors" />
                        </div>
                      </Link>
                    ) : (
                      <div
                        className="flex items-center gap-4 p-4 rounded-xl"
                        style={{ border: "1px solid #141414", background: "#080808", opacity: 0.7 }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: "#111", border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.3)" }}>
                          <Lock size={12} />
                        </div>
                        <p className="text-sm text-white/40 truncate">{lesson.title}</p>
                        <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>{lesson.estimated_minutes}m</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
