"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Check, BookOpen, Loader2 } from "lucide-react";
import type { Course, Profile } from "@/types";

interface Props {
  user: Profile;
  courses: Course[];
  enrolledIds: string[];
  onClose: () => void;
}

export default function UserEnrollModal({ user, courses, enrolledIds, onClose }: Props) {
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set(enrolledIds));
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle(courseId: string) {
    setLoading(courseId);
    const supabase = createClient();

    if (enrolled.has(courseId)) {
      await supabase
        .from("enrollments")
        .delete()
        .eq("user_id", user.id)
        .eq("course_id", courseId);
      setEnrolled((prev) => { const next = new Set(prev); next.delete(courseId); return next; });
    } else {
      await supabase
        .from("enrollments")
        .insert({ user_id: user.id, course_id: courseId });
      setEnrolled((prev) => new Set([...prev, courseId]));
    }

    setLoading(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ border: "1px solid #222", background: "#0d0d0d" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1a1a1a" }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Enroll in Courses</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {user.full_name || user.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Course list */}
        <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
          {courses.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "rgba(255,255,255,0.3)" }}>
              No courses available
            </p>
          ) : (
            courses.map((course) => {
              const isEnrolled = enrolled.has(course.id);
              const isLoading = loading === course.id;
              return (
                <button
                  key={course.id}
                  onClick={() => toggle(course.id)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    border: isEnrolled ? "1px solid rgba(74,222,128,0.25)" : "1px solid #1a1a1a",
                    background: isEnrolled ? "rgba(74,222,128,0.05)" : "#0a0a0a",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "#141414", border: "1px solid #222" }}
                  >
                    <BookOpen size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{course.title}</p>
                    <p className="text-xs mt-0.5 capitalize" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {course.difficulty} · {course.estimated_minutes}m
                    </p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                    style={isEnrolled
                      ? { background: "#4ade80", border: "1px solid #4ade80" }
                      : { background: "transparent", border: "1px solid #333" }}
                  >
                    {isLoading
                      ? <Loader2 size={11} className="animate-spin text-white" />
                      : isEnrolled && <Check size={11} className="text-black" />
                    }
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid #1a1a1a" }}>
          <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
            {enrolled.size} course{enrolled.size !== 1 ? "s" : ""} enrolled
          </p>
        </div>
      </div>
    </div>
  );
}
