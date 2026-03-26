"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input, Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { slugify } from "@/lib/utils";
import type { Course } from "@/types";

interface Props {
  course?: Course;
}

export default function CourseForm({ course }: Props) {
  const isEditing = !!course;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(course?.title ?? "");
  const [slug, setSlug] = useState(course?.slug ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">(course?.difficulty ?? "beginner");
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(course?.estimated_minutes ?? 30));
  const [isPublished, setIsPublished] = useState(course?.is_published ?? false);
  const [thumbnailUrl, setThumbnailUrl] = useState(course?.thumbnail_url ?? "");
  const [sortOrder, setSortOrder] = useState(String(course?.sort_order ?? 0));

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
      title, slug, description: description || null,
      difficulty, estimated_minutes: parseInt(estimatedMinutes) || 0,
      is_published: isPublished, thumbnail_url: thumbnailUrl || null,
      sort_order: parseInt(sortOrder) || 0,
    };

    if (isEditing) {
      const { error } = await supabase.from("courses").update(payload).eq("id", course.id);
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) { setError(error.message); setLoading(false); return; }
    }

    router.push("/admin/courses");
    router.refresh();
  }

  async function handleDelete() {
    if (!course || !confirm("Delete this course and all its lessons? This cannot be undone.")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("courses").delete().eq("id", course.id);
    router.push("/admin/courses");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input label="Title" value={title} onChange={(e) => handleTitleChange(e.target.value)} required placeholder="Behringer Wing: Signal Flow Fundamentals" />
      <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="behringer-wing-signal-flow" hint="URL-friendly identifier. Auto-generated from title." />
      <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What students will learn in this course..." rows={3} />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as "beginner" | "intermediate" | "advanced")}
          options={[
            { value: "beginner", label: "Beginner" },
            { value: "intermediate", label: "Intermediate" },
            { value: "advanced", label: "Advanced" },
          ]}
        />
        <Input label="Estimated minutes" type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} min="1" />
      </div>
      <Input label="Thumbnail URL (optional)" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." />
      <Input label="Sort order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} min="0" hint="Lower numbers appear first" />

      {/* Publish toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}>
        <div>
          <p className="text-sm font-medium text-white">Published</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {isPublished ? "Visible to students" : "Hidden from students"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPublished(!isPublished)}
          className="relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0"
          style={{
            width: "40px",
            height: "22px",
            background: isPublished ? "#ffffff" : "#2a2a2a",
            border: "1px solid " + (isPublished ? "#cccccc" : "#333"),
          }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200"
            style={{
              width: "16px",
              height: "16px",
              background: isPublished ? "#000" : "#666",
              transform: isPublished ? "translateX(18px)" : "translateX(0)",
              top: "2px",
              left: "2px",
            }}
          />
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-950 border border-red-900 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {isEditing ? "Save changes" : "Create course"}
        </Button>
        {isEditing && (
          <Button type="button" variant="danger" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
