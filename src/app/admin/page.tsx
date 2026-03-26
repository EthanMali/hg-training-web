import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, Users, Layers, TrendingUp, ArrowRight, Plus, Eye, Pencil } from "lucide-react";
import type { Course } from "@/types";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: courseCount },
    { count: lessonCount },
    { count: userCount },
    { count: enrollmentCount },
    { data: recentCourses },
    { data: draftCourses },
  ] = await Promise.all([
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("lessons").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(4),
    supabase.from("courses").select("*").eq("is_published", false).order("created_at", { ascending: false }).limit(3),
  ]);

  const stats = [
    { label: "Courses",     value: courseCount ?? 0,     icon: BookOpen,     color: "#3b82f6", sub: "total" },
    { label: "Lessons",     value: lessonCount ?? 0,     icon: Layers,       color: "#8b5cf6", sub: "across all courses" },
    { label: "Operators",   value: userCount ?? 0,       icon: Users,        color: "#10b981", sub: "registered" },
    { label: "Enrollments", value: enrollmentCount ?? 0, icon: TrendingUp,   color: "#f59e0b", sub: "total" },
  ];

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-1.5">Admin</h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          Manage courses, operators, and training content
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-5 rounded-xl"
            style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: stat.color + "18", border: `1px solid ${stat.color}28` }}
              >
                <stat.icon size={15} style={{ color: stat.color }} />
              </div>
              <span
                className="text-2xl font-bold text-white"
              >
                {stat.value}
              </span>
            </div>
            <p className="text-sm font-medium text-white">{stat.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Published courses */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid #1a1a1a" }}
          >
            <h2 className="text-sm font-semibold text-white">Published Courses</h2>
            <Link
              href="/admin/courses"
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "#111" }}>
            {recentCourses && recentCourses.length > 0 ? (
              (recentCourses as Course[]).map((course) => (
                <div key={course.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "#141414", border: "1px solid #1e1e1e" }}
                    >
                      <BookOpen size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{course.title}</p>
                      <p className="text-xs mt-0.5 capitalize" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {course.difficulty} · {course.estimated_minutes}m
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      <Eye size={13} />
                    </Link>
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      <Pencil size={13} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No published courses yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
              <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
            </div>
            <div className="p-3 space-y-2">
              <Link
                href="/admin/courses/new"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                style={{ border: "1px solid #1a1a1a", background: "#0d0d0d" }}
              >
                <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center flex-shrink-0">
                  <Plus size={13} className="text-black" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">New Course</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Create training content</p>
                </div>
              </Link>
              <Link
                href="/admin/courses"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                style={{ border: "1px solid #1a1a1a", background: "#0d0d0d" }}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: "#141414", border: "1px solid #222" }}
                >
                  <BookOpen size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Manage Courses</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Edit, publish, delete</p>
                </div>
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                style={{ border: "1px solid #1a1a1a", background: "#0d0d0d" }}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: "#141414", border: "1px solid #222" }}
                >
                  <Users size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Manage Users</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Roles &amp; enrollments</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Drafts */}
          {draftCourses && draftCourses.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
            >
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
                <h2 className="text-sm font-semibold text-white">Drafts</h2>
              </div>
              <div className="divide-y" style={{ borderColor: "#111" }}>
                {(draftCourses as Course[]).map((course) => (
                  <Link
                    key={course.id}
                    href={`/admin/courses/${course.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <p className="text-sm text-white truncate">{course.title}</p>
                    <span
                      className="text-xs px-2 py-0.5 rounded flex-shrink-0 ml-2"
                      style={{ background: "#111", color: "rgba(255,255,255,0.3)", border: "1px solid #1e1e1e" }}
                    >
                      draft
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
