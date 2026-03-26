import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CourseForm from "@/components/admin/CourseForm";
import Link from "next/link";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("*").eq("id", id).single();
  if (!course) notFound();

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/courses" className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>← Courses</Link>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Edit Course</h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{course.title}</p>
      </div>
      <div className="mb-6">
        <Link
          href={`/admin/courses/${id}/lessons`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
          style={{ border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.6)" }}
        >
          Manage lessons →
        </Link>
      </div>
      <CourseForm course={course} />
    </div>
  );
}
