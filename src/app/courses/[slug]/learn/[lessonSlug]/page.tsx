import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LessonSidebar from "@/components/lesson/LessonSidebar";
import LessonViewer from "@/components/lesson/LessonViewer";
import LessonHeader from "@/components/lesson/LessonHeader";
import type { ContentBlock, Lesson } from "@/types";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>;
}) {
  const { slug, lessonSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/courses/${slug}/learn/${lessonSlug}`);

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!course) notFound();

  // Check enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .single();

  if (!enrollment) redirect(`/courses/${slug}`);

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", course.id)
    .eq("slug", lessonSlug)
    .eq("is_published", true)
    .single();

  if (!lesson) notFound();

  const { data: blocks } = await supabase
    .from("content_blocks")
    .select("*")
    .eq("lesson_id", lesson.id)
    .order("sort_order");

  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, slug, title, sort_order, estimated_minutes")
    .eq("course_id", course.id)
    .eq("is_published", true)
    .order("sort_order");

  const { data: progressData } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed")
    .eq("user_id", user.id)
    .eq("course_id", course.id);

  const completedIds = new Set(
    (progressData ?? []).filter((p) => p.completed).map((p) => p.lesson_id)
  );

  // Find prev/next
  const sortedLessons = (allLessons ?? []) as Pick<Lesson, "id" | "slug" | "title" | "sort_order" | "estimated_minutes">[];
  const currentIndex = sortedLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#080808" }}>
      {/* Sidebar */}
      <LessonSidebar
        courseSlug={slug}
        courseTitle={course.title}
        lessons={sortedLessons}
        currentLessonId={lesson.id}
        completedIds={Array.from(completedIds)}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <LessonHeader
          courseSlug={slug}
          courseTitle={course.title}
          lessonTitle={lesson.title}
        />
        <div className="flex-1 overflow-y-auto">
          <LessonViewer
            lesson={lesson}
            blocks={(blocks ?? []) as ContentBlock[]}
            prevLesson={prevLesson}
            nextLesson={nextLesson}
            courseSlug={slug}
            userId={user.id}
            isCompleted={completedIds.has(lesson.id)}
          />
        </div>
      </div>
    </div>
  );
}
