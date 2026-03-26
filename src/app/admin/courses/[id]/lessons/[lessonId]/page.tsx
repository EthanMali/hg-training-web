import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LessonForm from "@/components/admin/LessonForm";
import ContentBlockEditor from "@/components/admin/ContentBlockEditor";
import type { ContentBlock } from "@/types";

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("title").eq("id", id).single();
  if (!course) notFound();

  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
  if (!lesson) notFound();

  const { data: blocks } = await supabase
    .from("content_blocks")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("sort_order");

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin/courses" className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Courses</Link>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
        <Link href={`/admin/courses/${id}/lessons`} className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>{course.title}</Link>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{lesson.title}</span>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Lesson metadata */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-base font-semibold text-white mb-4">Lesson Details</h2>
            <LessonForm courseId={id} lesson={lesson} />
          </div>
        </div>

        {/* Right: Block editor */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-white mb-4">Content Blocks</h2>
          <ContentBlockEditor
            lessonId={lessonId}
            initialBlocks={(blocks ?? []) as ContentBlock[]}
          />
        </div>
      </div>
    </div>
  );
}
