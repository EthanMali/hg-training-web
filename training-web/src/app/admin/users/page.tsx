import { createClient } from "@/lib/supabase/server";
import UsersClient from "./UsersClient";
import type { Profile, Course } from "@/types";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: courses }, { data: enrollments }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("courses").select("*").order("sort_order"),
    supabase.from("enrollments").select("user_id, course_id"),
  ]);

  return (
    <UsersClient
      profiles={(profiles ?? []) as Profile[]}
      courses={(courses ?? []) as Course[]}
      enrollments={(enrollments ?? []) as { user_id: string; course_id: string }[]}
    />
  );
}
