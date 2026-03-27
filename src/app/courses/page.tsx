import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import { ArrowRight, Clock, BookOpen } from "lucide-react";
import type { Course } from "@/types";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/courses");

  // Only show courses this user is enrolled in
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", user.id);

  const enrolledCourseIds = enrollments?.map((e: { course_id: string }) => e.course_id) ?? [];

  let courses: Course[] = [];
  if (enrolledCourseIds.length > 0) {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .in("id", enrolledCourseIds)
      .order("sort_order");
    courses = data ?? [];
  }

  // Get lesson counts per course
  const courseIds = courses.map((c) => c.id);
  const { data: lessonCounts } = courseIds.length > 0
    ? await supabase
        .from("lessons")
        .select("course_id")
        .in("course_id", courseIds)
        .eq("is_published", true)
    : { data: [] };

  // Get user progress
  const { data: progressData } = courseIds.length > 0
    ? await supabase
        .from("lesson_progress")
        .select("course_id, completed")
        .eq("user_id", user.id)
        .in("course_id", courseIds)
    : { data: [] };

  function getLessonCount(courseId: string) {
    return lessonCounts?.filter((l: { course_id: string }) => l.course_id === courseId).length ?? 0;
  }
  function getCompletedCount(courseId: string) {
    return (progressData ?? []).filter(
      (p: { course_id: string; completed: boolean }) => p.course_id === courseId && p.completed
    ).length;
  }

  const difficulties = ["beginner", "intermediate", "advanced"] as const;

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">My Courses</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            {courses.length} course{courses.length !== 1 ? "s" : ""} assigned to you
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen size={40} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium text-white/60 mb-2">No courses assigned yet</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              An admin needs to assign courses to your account before you can start learning.
            </p>
          </div>
        ) : (
          <>
            {difficulties.map((difficulty) => {
              const filtered = courses.filter((c) => c.difficulty === difficulty);
              if (!filtered.length) return null;
              return (
                <div key={difficulty} className="mb-12">
                  <div className="flex items-center gap-3 mb-5">
                    <Badge variant={difficulty}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</Badge>
                    <div className="flex-1 h-px" style={{ background: "#1a1a1a" }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((course) => {
                      const total = getLessonCount(course.id);
                      const completed = getCompletedCount(course.id);
                      const pct = total > 0 ? (completed / total) * 100 : 0;
                      return (
                        <Link
                          key={course.id}
                          href={`/courses/${course.slug}`}
                          className="group flex flex-col rounded-xl transition-all duration-200 overflow-hidden"
                          style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
                        >
                          {course.thumbnail_url ? (
                            <div className="w-full aspect-video overflow-hidden bg-black">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-video flex items-center justify-center" style={{ background: "#0f0f0f" }}>
                              <BookOpen size={28} style={{ color: "rgba(255,255,255,0.08)" }} />
                            </div>
                          )}
                          <div className="p-5 flex flex-col flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant={difficulty}>{difficulty}</Badge>
                              <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                                <Clock size={11} /> {course.estimated_minutes}m
                              </div>
                            </div>
                            <h3 className="font-semibold text-white mb-2 group-hover:text-white transition-colors">{course.title}</h3>
                            {course.description && (
                              <p className="text-sm line-clamp-2 mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>{course.description}</p>
                            )}
                            <div className="mt-auto space-y-3">
                              {total > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                                    <span>{total} lessons</span>
                                    <span>{completed}/{total} done</span>
                                  </div>
                                  <Progress value={pct} size="xs" />
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
                                {completed === total && total > 0 ? "Review course" : completed > 0 ? "Continue" : "Start learning"}
                                <ArrowRight size={11} />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
