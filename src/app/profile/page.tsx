import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { BookOpen, ArrowRight, CheckCircle2, Clock, Shield } from "lucide-react";
import type { Course } from "@/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, course:courses(*)")
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("course_id, completed")
    .eq("user_id", user.id);

  // Progress per course
  const progressMap: Record<string, { completed: number; total: number }> = {};
  if (progress) {
    for (const p of progress) {
      if (!progressMap[p.course_id]) progressMap[p.course_id] = { completed: 0, total: 0 };
      progressMap[p.course_id].total += 1;
      if (p.completed) progressMap[p.course_id].completed += 1;
    }
  }

  const initials = (profile?.full_name || profile?.email || "?")[0].toUpperCase();
  const completedCourses = enrollments?.filter((e) => e.completed_at).length ?? 0;
  const inProgress = (enrollments?.length ?? 0) - completedCourses;

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Profile header */}
        <div
          className="flex items-start gap-5 p-6 rounded-2xl mb-6"
          style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "rgba(255,255,255,0.7)" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-white">{profile?.full_name || "Operator"}</h1>
              {profile?.role === "admin" && (
                <span
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md"
                  style={{ background: "#1a1200", color: "#fbbf24", border: "1px solid #5a4000" }}
                >
                  <Shield size={10} /> Admin
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{profile?.email}</p>
            <div className="flex flex-wrap gap-4 mt-4">
              <div>
                <p className="text-lg font-bold text-white">{enrollments?.length ?? 0}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Courses enrolled</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{completedCourses}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Completed</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{inProgress}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>In progress</p>
              </div>
            </div>
          </div>
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ border: "1px solid #2a2a2a", color: "rgba(255,255,255,0.5)", background: "#111" }}
            >
              Admin panel →
            </Link>
          )}
        </div>

        {/* Enrolled courses */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Your Courses</h2>
          {enrollments && enrollments.length > 0 ? (
            <div className="space-y-3">
              {enrollments.map((enrollment) => {
                const course = enrollment.course as unknown as Course;
                if (!course) return null;
                const prog = progressMap[course.id] ?? { completed: 0, total: 0 };
                const pct = prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0;
                const isDone = enrollment.completed_at;

                return (
                  <Link
                    key={enrollment.id}
                    href={`/courses/${course.slug}`}
                    className="group flex items-center gap-4 p-5 rounded-xl transition-all"
                    style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "#111", border: "1px solid #1e1e1e" }}
                    >
                      {isDone
                        ? <CheckCircle2 size={18} className="text-emerald-400" />
                        : <BookOpen size={18} style={{ color: "rgba(255,255,255,0.3)" }} />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white mb-0.5">{course.title}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {course.difficulty}
                        </span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {course.estimated_minutes}m
                        </span>
                      </div>
                      {/* Progress bar */}
                      {prog.total > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                              {prog.completed}/{prog.total} lessons
                            </span>
                            <span className="text-xs font-medium" style={{ color: pct === 100 ? "#4ade80" : "rgba(255,255,255,0.4)" }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: pct === 100 ? "#4ade80" : "rgba(255,255,255,0.25)" }}
                            />
                          </div>
                        </div>
                      )}
                      {prog.total === 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Not started</span>
                        </div>
                      )}
                    </div>

                    <ArrowRight
                      size={15}
                      className="flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                      style={{ color: "rgba(255,255,255,0.2)" }}
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div
              className="text-center py-12 rounded-xl"
              style={{ border: "1px dashed #1e1e1e" }}
            >
              <BookOpen size={24} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
              <p className="text-sm font-medium text-white mb-1">No courses yet</p>
              <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
                Check back once an admin enrolls you in a course
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-100 transition-colors font-medium"
              >
                Browse courses <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
