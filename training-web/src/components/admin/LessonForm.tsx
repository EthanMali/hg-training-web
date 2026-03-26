"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { slugify } from "@/lib/utils";
import type { Lesson } from "@/types";

interface Props {
  courseId: string;
  lesson?: Lesson;
}

export default function LessonForm({ courseId, lesson }: Props) {
  const isEditing = !!lesson;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(lesson?.title ?? "");
  const [slug, setSlug] = useState(lesson?.slug ?? "");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(lesson?.estimated_minutes ?? 5));
  const [sortOrder, setSortOrder] = useState(String(lesson?.sort_order ?? 0));
  const [isPublished, setIsPublished] = useState(lesson?.is_published ?? false);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!isEditing) setSlug(slugify(val));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      course_id: courseId, title, slug,
      description: description || null,
      estimated_minutes: parseInt(estimatedMinutes) || 5,
      sort_order: parseInt(sortOrder) || 0,
      is_published: isPublished,
    };

    if (isEditing) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", lesson.id);
      if (error) { setError(error.message); setLoading(false); return; }
      router.refresh();
    } else {
      const { data, error } = await supabase.from("lessons").insert(payload).select().single();
      if (error) { setError(error.message); setLoading(false); return; }
      router.push(`/admin/courses/${courseId}/lessons/${data.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input label="Title" value={title} onChange={(e) => handleTitleChange(e.target.value)} required placeholder="Understanding Gain Structure" />
      <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="understanding-gain-structure" />
      <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief overview of this lesson..." rows={2} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Estimated minutes" type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} min="1" />
        <Input label="Sort order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} min="0" />
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}>
        <div>
          <p className="text-sm font-medium text-white">Published</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {isPublished ? "Visible to enrolled students" : "Hidden"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPublished(!isPublished)}
          className="relative rounded-full transition-colors duration-200 flex-shrink-0"
          style={{ width: "40px", height: "22px", background: isPublished ? "#ffffff" : "#2a2a2a", border: "1px solid " + (isPublished ? "#ccc" : "#333") }}
        >
          <span
            className="absolute rounded-full transition-transform duration-200"
            style={{ width: "16px", height: "16px", background: isPublished ? "#000" : "#666", transform: isPublished ? "translateX(18px)" : "translateX(0)", top: "2px", left: "2px" }}
          />
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-950 border border-red-900 px-3 py-2 rounded-lg">{error}</p>}

      <Button type="submit" loading={loading} className="w-full">
        {isEditing ? "Save changes" : "Create lesson"}
      </Button>
    </form>
  );
}
