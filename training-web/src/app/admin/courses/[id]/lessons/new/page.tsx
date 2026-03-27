import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LessonForm from "@/components/admin/LessonForm";
import Link from "next/link";

export default async function NewLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("title").eq("id", id).single();
  if (!course) notFound();

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <Link href={`/admin/courses/${id}/lessons`} className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>← {course.title}</Link>
      </div>
      <div className="mb-8 mt-2">
        <h1 className="text-2xl font-bold text-white mb-1">New Lesson</h1>
      </div>
      <LessonForm courseId={id} />
    </div>
  );
}
