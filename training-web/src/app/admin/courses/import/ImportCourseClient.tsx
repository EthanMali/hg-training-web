"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Upload, FileJson, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronRight, BookOpen, Layers, ArrowLeft,
  AlertCircle, Download,
} from "lucide-react";
import Link from "next/link";

/* ── types ─────────────────────────────────────────── */
interface ImportBlock {
  block_type: "text" | "video" | "image" | "quiz" | "callout" | "diagram";
  content: Record<string, unknown>;
}
interface ImportLesson {
  title: string;
  description?: string;
  estimated_minutes?: number;
  blocks?: ImportBlock[];
}
interface ImportCourse {
  title: string;
  description?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  estimated_minutes?: number;
  lessons?: ImportLesson[];
}

type StepStatus = "pending" | "running" | "done" | "error";
interface Step { label: string; status: StepStatus; }

/* ── helpers ────────────────────────────────────────── */
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function validateCourse(obj: unknown): { ok: true; data: ImportCourse } | { ok: false; error: string } {
  if (typeof obj !== "object" || obj === null) return { ok: false, error: "JSON must be an object" };
  const o = obj as Record<string, unknown>;
  if (!o.title || typeof o.title !== "string") return { ok: false, error: 'Missing required field: "title"' };
  const difficulties = ["beginner", "intermediate", "advanced"];
  if (o.difficulty && !difficulties.includes(o.difficulty as string))
    return { ok: false, error: `"difficulty" must be one of: ${difficulties.join(", ")}` };
  if (o.lessons && !Array.isArray(o.lessons)) return { ok: false, error: '"lessons" must be an array' };
  return { ok: true, data: obj as ImportCourse };
}

/* ── example JSON ───────────────────────────────────── */
const EXAMPLE_JSON = JSON.stringify({
  title: "My Course Title",
  description: "What students will learn in this course.",
  difficulty: "beginner",
  estimated_minutes: 45,
  lessons: [
    {
      title: "Lesson One",
      description: "Introduction lesson.",
      estimated_minutes: 15,
      blocks: [
        { block_type: "text", content: { html: "<p>Welcome to the course!</p>" } },
        { block_type: "callout", content: { variant: "tip", body: "Pro tip: take notes as you go." } },
        {
          block_type: "quiz",
          content: {
            question: "What does this course cover?",
            options: [{ text: "Everything" }, { text: "Nothing" }],
            correct_index: 0,
            explanation: "This course covers everything you need to know.",
          },
        },
      ],
    },
  ],
}, null, 2);

/* ── component ──────────────────────────────────────── */
export default function ImportCourseClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"paste" | "upload">("upload");
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ImportCourse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);

  /* parse raw JSON */
  function parse(text: string) {
    setRaw(text);
    setParseError(null);
    setParsed(null);
    if (!text.trim()) return;
    try {
      const obj = JSON.parse(text);
      const result = validateCourse(obj);
      if (result.ok) setParsed(result.data);
      else setParseError(result.error);
    } catch {
      setParseError("Invalid JSON — check syntax");
    }
  }

  /* drag & drop */
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => parse(ev.target?.result as string);
    reader.readAsText(file);
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => parse(ev.target?.result as string);
    reader.readAsText(file);
  }

  /* update step status */
  function setStep(index: number, status: StepStatus) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, status } : s)));
  }

  /* ── main import ── */
  async function runImport() {
    if (!parsed) return;
    setImporting(true);

    const lessonCount = parsed.lessons?.length ?? 0;
    const totalBlockCount = parsed.lessons?.reduce((a, l) => a + (l.blocks?.length ?? 0), 0) ?? 0;

    const initialSteps: Step[] = [
      { label: "Creating course", status: "pending" },
      ...((parsed.lessons ?? []).map((l, i) => ({
        label: `Lesson ${i + 1}: ${l.title}`,
        status: "pending" as StepStatus,
      }))),
      ...(totalBlockCount > 0 ? [{ label: `Inserting ${totalBlockCount} content block(s)`, status: "pending" as StepStatus }] : []),
    ];
    setSteps(initialSteps);

    const supabase = createClient();

    // Step 0 — create course
    setStep(0, "running");
    const coursePayload = {
      title: parsed.title,
      slug: slugify(parsed.title) + "-" + Date.now().toString(36),
      description: parsed.description ?? null,
      difficulty: parsed.difficulty ?? "beginner",
      estimated_minutes: parsed.estimated_minutes ?? 0,
      is_published: false,
      sort_order: 0,
    };
    const { data: courseData, error: courseErr } = await supabase
      .from("courses")
      .insert(coursePayload)
      .select()
      .single();
    if (courseErr || !courseData) {
      setStep(0, "error");
      setSteps((prev) => [...prev, { label: `Error: ${courseErr?.message}`, status: "error" }]);
      setImporting(false);
      return;
    }
    setStep(0, "done");

    // Steps 1..N — create lessons
    const lessonIds: string[] = [];
    for (let i = 0; i < lessonCount; i++) {
      const lesson = parsed.lessons![i];
      setStep(i + 1, "running");
      const { data: lessonData, error: lessonErr } = await supabase
        .from("lessons")
        .insert({
          course_id: courseData.id,
          title: lesson.title,
          slug: slugify(lesson.title) + "-" + i,
          description: lesson.description ?? null,
          estimated_minutes: lesson.estimated_minutes ?? 10,
          sort_order: i,
          is_published: false,
        })
        .select()
        .single();
      if (lessonErr || !lessonData) {
        setStep(i + 1, "error");
        setImporting(false);
        return;
      }
      lessonIds.push(lessonData.id);
      setStep(i + 1, "done");
    }

    // Last step — blocks
    if (totalBlockCount > 0) {
      const blockStepIdx = lessonCount + 1;
      setStep(blockStepIdx, "running");
      const allBlocks = (parsed.lessons ?? []).flatMap((lesson, li) =>
        (lesson.blocks ?? []).map((block, bi) => ({
          lesson_id: lessonIds[li],
          block_type: block.block_type,
          sort_order: bi,
          content: block.content,
        }))
      );
      const { error: blocksErr } = await supabase.from("content_blocks").insert(allBlocks);
      if (blocksErr) {
        setStep(blockStepIdx, "error");
        setImporting(false);
        return;
      }
      setStep(blockStepIdx, "done");
    }

    setDone(true);
    setFinalUrl(`/admin/courses/${courseData.id}`);
    setImporting(false);
  }

  /* ── render ── */
  if (done && finalUrl) {
    return (
      <div className="p-8 max-w-lg">
        <div className="text-center py-12 rounded-2xl" style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}>
          <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-400" />
          <h2 className="text-xl font-bold text-white mb-2">Import complete</h2>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
            Course &quot;{parsed?.title}&quot; was created with {parsed?.lessons?.length ?? 0} lesson(s).
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href={finalUrl}
              className="bg-white text-black px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              Open course →
            </Link>
            <Link
              href="/admin/courses"
              className="px-5 py-2.5 rounded-xl text-sm transition-colors"
              style={{ border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.5)" }}
            >
              All courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/courses" className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Import Course from JSON</h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Upload or paste a JSON file to create a course with lessons and content blocks
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left — input */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
            {(["upload", "paste"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={tab === t
                  ? { background: "#fff", color: "#000" }
                  : { color: "rgba(255,255,255,0.4)" }}
              >
                {t === "upload" ? "Upload file" : "Paste JSON"}
              </button>
            ))}
          </div>

          {tab === "upload" ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer flex flex-col items-center justify-center gap-3 py-14 rounded-xl transition-all"
              style={{
                border: `2px dashed ${dragging ? "rgba(255,255,255,0.3)" : "#222"}`,
                background: dragging ? "rgba(255,255,255,0.03)" : "#080808",
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#111", border: "1px solid #222" }}>
                <Upload size={18} style={{ color: "rgba(255,255,255,0.4)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Drop your JSON file here</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>or click to browse</p>
              </div>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFileChange} />
            </div>
          ) : (
            <textarea
              value={raw}
              onChange={(e) => parse(e.target.value)}
              placeholder={`Paste your JSON here...\n\n${EXAMPLE_JSON}`}
              rows={16}
              className="w-full rounded-xl p-4 text-xs font-mono resize-none outline-none"
              style={{
                background: "#080808",
                border: `1px solid ${parseError ? "#7f1d1d" : "#1a1a1a"}`,
                color: "rgba(255,255,255,0.7)",
              }}
            />
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400" style={{ background: "#1a0000", border: "1px solid #5a0000" }}>
              <XCircle size={14} className="flex-shrink-0" />
              {parseError}
            </div>
          )}

          {/* File loaded indicator */}
          {raw && !parseError && tab === "upload" && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-emerald-400" style={{ background: "#001a0a", border: "1px solid #005a20" }}>
              <CheckCircle2 size={14} className="flex-shrink-0" />
              File loaded — {raw.length.toLocaleString()} characters
            </div>
          )}
        </div>

        {/* Right — preview + actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Download example */}
          <button
            onClick={() => {
              const blob = new Blob([EXAMPLE_JSON], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "course-example.json"; a.click();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors hover:bg-white/[0.03]"
            style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
          >
            <Download size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
            <div>
              <p className="text-xs font-medium text-white">Download example JSON</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>See the required format</p>
            </div>
          </button>

          {/* Schema reference */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #1a1a1a" }}>
              <p className="text-xs font-semibold text-white">JSON Schema</p>
            </div>
            <div className="p-4 text-xs font-mono space-y-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              {[
                ['title', 'string (required)'],
                ['description', 'string'],
                ['difficulty', '"beginner" | "intermediate" | "advanced"'],
                ['estimated_minutes', 'number'],
                ['lessons[]', 'array'],
                ['  .title', 'string (required)'],
                ['  .description', 'string'],
                ['  .estimated_minutes', 'number'],
                ['  .blocks[]', 'array'],
                ['    .block_type', '"text"|"video"|"image"|"quiz"|"callout"|"diagram"'],
                ['    .content', 'object (block-specific)'],
              ].map(([key, val]) => (
                <div key={key} className="flex gap-2">
                  <span style={{ color: "rgba(255,255,255,0.6)", minWidth: key.startsWith("  .") ? "130px" : "120px" }}>{key}</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Course preview */}
          {parsed && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #1a1a1a" }}>
                <FileJson size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                <p className="text-xs font-semibold text-white">Preview</p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white">{parsed.title}</p>
                  {parsed.description && (
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "rgba(255,255,255,0.4)" }}>{parsed.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span className="capitalize">{parsed.difficulty ?? "beginner"}</span>
                  <span>{parsed.estimated_minutes ?? 0}m</span>
                  <span className="flex items-center gap-1"><BookOpen size={10} /> {parsed.lessons?.length ?? 0} lessons</span>
                  <span className="flex items-center gap-1">
                    <Layers size={10} />
                    {parsed.lessons?.reduce((a, l) => a + (l.blocks?.length ?? 0), 0) ?? 0} blocks
                  </span>
                </div>
                {(parsed.lessons ?? []).map((l, i) => (
                  <LessonPreviewRow key={i} lesson={l} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Import button */}
          {parsed && (
            <button
              onClick={runImport}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {importing ? "Importing…" : "Import course"}
            </button>
          )}

          {/* Progress steps */}
          {steps.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}>
              <div className="divide-y" style={{ borderColor: "#111" }}>
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    {step.status === "pending" && <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ border: "1px solid #333" }} />}
                    {step.status === "running" && <Loader2 size={14} className="animate-spin flex-shrink-0 text-white" />}
                    {step.status === "done"    && <CheckCircle2 size={14} className="flex-shrink-0 text-emerald-400" />}
                    {step.status === "error"   && <XCircle size={14} className="flex-shrink-0 text-red-400" />}
                    <span className="text-xs" style={{ color: step.status === "done" ? "rgba(255,255,255,0.6)" : step.status === "error" ? "#f87171" : "rgba(255,255,255,0.4)" }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alert */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: "#0a0800", border: "1px solid #2a2000" }}>
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-amber-400" />
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Courses are imported as <strong className="text-white/60">drafts</strong>. Publish manually after reviewing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonPreviewRow({ lesson, index }: { lesson: ImportLesson; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #1a1a1a" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        {open ? <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.3)" }} /> : <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.3)" }} />}
        <span className="text-xs font-medium text-white flex-1 truncate">
          {index + 1}. {lesson.title}
        </span>
        <span className="text-xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
          {lesson.blocks?.length ?? 0} blocks
        </span>
      </button>
      {open && (lesson.blocks ?? []).length > 0 && (
        <div className="px-3 pb-2 space-y-1">
          {lesson.blocks!.map((block, bi) => (
            <div key={bi} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              <span className="w-4 text-right">{bi + 1}.</span>
              <span className="capitalize">{block.block_type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
