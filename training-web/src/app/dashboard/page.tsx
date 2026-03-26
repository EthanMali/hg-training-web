import { redirect } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import Progress from "@/components/ui/Progress";
import Badge from "@/components/ui/Badge";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import type { Course, Enrollment } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  // Get enrollments with course data
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, courses(*)")
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  // Get progress for all enrolled courses
  const courseIds = enrollments?.map((e: { course_id: string }) => e.course_id) ?? [];
  const { data: lessonProgress } = courseIds.length > 0
    ? await supabase
        .from("lesson_progress")
        .select("course_id, completed")
        .eq("user_id", user.id)
        .in("course_id", courseIds)
    : { data: [] };

  // Get lesson counts
  const { data: allLessons } = courseIds.length > 0
    ? await supabase
        .from("lessons")
        .select("course_id")
        .in("course_id", courseIds)
        .eq("is_published", true)
    : { data: [] };

  function getProgress(courseId: string) {
    const total = allLessons?.filter((l: { course_id: string }) => l.course_id === courseId).length ?? 0;
    const done = lessonProgress?.filter((p: { course_id: string; completed: boolean }) => p.course_id === courseId && p.completed).length ?? 0;
    return { total, done, pct: total > 0 ? (done / total) * 100 : 0 };
  }

  const completedCount = enrollments?.filter((e: Enrollment) => e.completed_at).length ?? 0;
  const inProgressCount = (enrollments?.length ?? 0) - completedCount;

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-1">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            {user.email}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Enrolled", value: enrollments?.length ?? 0 },
            { label: "In progress", value: inProgressCount },
            { label: "Completed", value: completedCount },
          ].map((stat) => (
            <div key={stat.label} className="p-5 rounded-xl" style={{ border: "1px solid #1a1a1a", background: "#0d0d0d" }}>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Enrolled courses */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">My Courses</h2>
            <Link href="/courses" className="text-sm transition-colors flex items-center gap-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Browse more <ArrowRight size={13} />
            </Link>
          </div>

          {!enrollments || enrollments.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ border: "1px dashed #1e1e1e" }}>
              <BookOpen size={36} className="mx-auto mb-3 opacity-20" />
              <p className="mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>You haven&apos;t enrolled in any courses yet.</p>
              <Link href="/courses" className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
                Browse courses <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrollments.map((enrollment: Enrollment & { courses: Course }) => {
                const course = enrollment.courses;
                if (!course) return null;
                const { total, done, pct } = getProgress(course.id);
                const isComplete = !!enrollment.completed_at;
                return (
                  <Link
                    key={enrollment.id}
                    href={`/courses/${course.slug}`}
                    className="group flex flex-col rounded-xl overflow-hidden transition-all duration-200"
                    style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
                  >
                    {course.thumbnail_url ? (
                      <div className="w-full aspect-video overflow-hidden">
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video flex items-center justify-center" style={{ background: "#111" }}>
                        <BookOpen size={24} style={{ color: "rgba(255,255,255,0.08)" }} />
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant={course.difficulty as "beginner" | "intermediate" | "advanced"}>
                        {course.difficulty}
                      </Badge>
                      {isComplete && <CheckCircle2 size={14} style={{ color: "#4ade80" }} />}
                    </div>
                    <h3 className="font-medium text-white text-sm mb-3">{course.title}</h3>
                    <div className="mt-auto space-y-2">
                      <Progress value={pct} size="xs" />
                      <div className="flex items-center justify-between text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <span>{done}/{total} lessons</span>
                        <span>{Math.round(pct)}%</span>
                      </div>
                    </div>
                    </div>
                  </Link>
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
