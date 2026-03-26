"use client";
import { useState, useTransition } from "react";
import { BookOpen, Shield, ShieldOff } from "lucide-react";
import UserEnrollModal from "@/components/admin/UserEnrollModal";
import type { Profile, Course } from "@/types";

interface Props {
  profiles: Profile[];
  courses: Course[];
  enrollments: { user_id: string; course_id: string }[];
}

export default function UsersClient({ profiles, courses, enrollments }: Props) {
  const [enrollTarget, setEnrollTarget] = useState<Profile | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localProfiles, setLocalProfiles] = useState(profiles);

  function getEnrolledIds(userId: string) {
    return enrollments.filter((e) => e.user_id === userId).map((e) => e.course_id);
  }

  function toggleRole(profile: Profile) {
    const newRole = profile.role === "admin" ? "student" : "admin";
    setLocalProfiles((prev) => prev.map((p) => p.id === profile.id ? { ...p, role: newRole } : p));
    startTransition(async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.from("profiles").update({ role: newRole }).eq("id", profile.id);
    });
  }

  return (
    <>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Users</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            {localProfiles.length} registered operator{localProfiles.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a1a" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1a1a", background: "#0d0d0d" }}>
                {["User", "Role", "Courses", "Joined", "Actions"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-xs font-medium ${i === 4 ? "text-right" : "text-left"}`}
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localProfiles.map((profile) => {
                const enrolledCount = enrollments.filter((e) => e.user_id === profile.id).length;
                return (
                  <tr key={profile.id} style={{ borderBottom: "1px solid #111", background: "#0a0a0a" }}>
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "rgba(255,255,255,0.6)" }}
                        >
                          {(profile.full_name || profile.email)?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{profile.full_name || "—"}</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{profile.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-md"
                        style={profile.role === "admin"
                          ? { background: "#1a1200", color: "#fbbf24", border: "1px solid #5a4000" }
                          : { background: "#0d0d0d", color: "rgba(255,255,255,0.4)", border: "1px solid #1e1e1e" }}
                      >
                        {profile.role}
                      </span>
                    </td>

                    {/* Courses */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setEnrollTarget(profile)}
                        className="flex items-center gap-1.5 text-xs transition-colors hover:text-white"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        <BookOpen size={12} />
                        {enrolledCount} enrolled
                      </button>
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEnrollTarget(profile)}
                          className="text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                          style={{ border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.4)", background: "#0d0d0d" }}
                        >
                          <BookOpen size={11} /> Enroll
                        </button>
                        <button
                          onClick={() => toggleRole(profile)}
                          disabled={isPending}
                          className="text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                          style={{ border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.4)", background: "#0d0d0d" }}
                        >
                          {profile.role === "admin"
                            ? <><ShieldOff size={11} /> Remove admin</>
                            : <><Shield size={11} /> Make admin</>
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {enrollTarget && (
        <UserEnrollModal
          user={enrollTarget}
          courses={courses}
          enrolledIds={getEnrolledIds(enrollTarget.id)}
          onClose={() => setEnrollTarget(null)}
        />
      )}
    </>
  );
}
