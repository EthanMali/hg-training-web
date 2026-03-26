import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lesson_id, course_id } = await request.json();
  if (!lesson_id || !course_id) {
    return NextResponse.json({ error: "Missing lesson_id or course_id" }, { status: 400 });
  }

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id,
      course_id,
      completed: true,
      completed_at: new Date().toISOString(),
      last_visited: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if course is complete
  const { count: totalCount } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("course_id", course_id)
    .eq("is_published", true);

  const { count: completedCount } = await supabase
    .from("lesson_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("course_id", course_id)
    .eq("completed", true);

  const courseComplete = totalCount != null && completedCount != null && completedCount >= totalCount;

  if (courseComplete) {
    await supabase
      .from("enrollments")
      .update({ completed_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .is("completed_at", null);
  }

  return NextResponse.json({ ok: true, courseComplete });
}
