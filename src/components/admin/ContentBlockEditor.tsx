"use client";
import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import {
  GripVertical, Trash2, ChevronDown, ChevronUp,
  Type, Play, Image as ImageIcon, HelpCircle, Network,
  AlertCircle, Check, Loader2, Copy, Plus, Zap,
} from "lucide-react";
import TextBlockEditor from "./BlockEditors/TextBlockEditor";
import InteractiveBlockEditor from "./BlockEditors/InteractiveBlockEditor";
import VideoBlockEditor from "./BlockEditors/VideoBlockEditor";
import QuizBlockEditor from "./BlockEditors/QuizBlockEditor";
import DiagramBlockEditor from "./BlockEditors/DiagramBlockEditor";
import CalloutBlockEditor from "./BlockEditors/CalloutBlockEditor";
import ImageBlockEditor from "./BlockEditors/ImageBlockEditor";
import type { ContentBlock, BlockType } from "@/types";

const BLOCK_TYPES = [
  { type: "text" as BlockType,    label: "Text",    desc: "Rich text with formatting",  Icon: Type,         color: "#3b82f6" },
  { type: "video" as BlockType,   label: "Video",   desc: "YouTube or video URL",        Icon: Play,         color: "#8b5cf6" },
  { type: "image" as BlockType,   label: "Image",   desc: "Image with caption",          Icon: ImageIcon,    color: "#10b981" },
  { type: "quiz" as BlockType,    label: "Quiz",    desc: "Multiple-choice check",       Icon: HelpCircle,   color: "#f59e0b" },
  { type: "diagram" as BlockType, label: "Diagram", desc: "Interactive diagram",         Icon: Network,      color: "#06b6d4" },
  { type: "callout" as BlockType,      label: "Callout",     desc: "Tip, warning, or note box",     Icon: AlertCircle,  color: "#f97316" },
  { type: "interactive" as BlockType,  label: "Interactive", desc: "EQ lab or signal flow activity", Icon: Zap,          color: "#a855f7" },
];

function getMeta(type: BlockType) {
  return BLOCK_TYPES.find((b) => b.type === type) ?? BLOCK_TYPES[0];
}

function getDefaultContent(type: BlockType) {
  switch (type) {
    case "text":    return { html: "<p>Enter your content here...</p>" };
    case "video":   return { url: "", caption: "" };
    case "image":   return { url: "", alt: "", caption: "" };
    case "quiz":    return { question: "", options: [{ text: "" }, { text: "" }], correct_index: 0, explanation: "" };
    case "diagram":      return { svg_key: "wing-channel-strip", hotspots: [] };
    case "callout":      return { variant: "tip", body: "" };
    case "interactive":  return { subtype: "eq", title: "", description: "" };
    default:        return {};
  }
}

function getContentPreview(block: ContentBlock): string {
  const c = block.content as unknown as Record<string, unknown>;
  switch (block.block_type) {
    case "text":    return ((c.html as string) ?? "").replace(/<[^>]+>/g, "").slice(0, 70) || "Empty text block";
    case "video":   return (c.url as string) || "No video URL";
    case "image":   return (c.alt as string) || (c.url as string) || "No image set";
    case "quiz":    return (c.question as string) || "No question set";
    case "diagram": return `${((c.hotspots as unknown[]) ?? []).length} hotspot(s)`;
    case "callout": return ((c.body as string) ?? "").slice(0, 70) || "Empty callout";
    default:        return "";
  }
}

/* ───────── SortableBlock ───────── */

interface SortableBlockProps {
  block: ContentBlock;
  index: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: Record<string, unknown>) => void;
  onDuplicate: (block: ContentBlock) => void;
}

function SortableBlock({ block, index, onDelete, onUpdate, onDuplicate }: SortableBlockProps) {
  const [expanded, setExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const meta = getMeta(block.block_type);
  const { Icon, color, label } = meta;

  const containerStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  function renderEditor() {
    switch (block.block_type) {
      case "text":    return <TextBlockEditor    block={block} onUpdate={onUpdate} />;
      case "video":   return <VideoBlockEditor   block={block} onUpdate={onUpdate} />;
      case "image":   return <ImageBlockEditor   block={block} onUpdate={onUpdate} />;
      case "quiz":    return <QuizBlockEditor    block={block} onUpdate={onUpdate} />;
      case "diagram": return <DiagramBlockEditor block={block} onUpdate={onUpdate} />;
      case "callout":      return <CalloutBlockEditor      block={block} onUpdate={onUpdate} />;
      case "interactive":  return <InteractiveBlockEditor  block={block} onUpdate={onUpdate} />;
      default:             return null;
    }
  }

  return (
    <div ref={setNodeRef} style={containerStyle} {...attributes}>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: isDragging ? `1px solid ${color}50` : "1px solid #1e1e1e",
          background: "#0d0d0d",
          boxShadow: isDragging ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${color}30` : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 select-none"
          style={{
            borderBottom: expanded ? "1px solid #1a1a1a" : "none",
            borderLeft: `3px solid ${color}`,
          }}
        >
          {/* Drag handle */}
          <button
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/5 flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.18)", touchAction: "none" }}
          >
            <GripVertical size={13} />
          </button>

          {/* Index */}
          <span className="text-xs font-mono w-5 text-center flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
            {index + 1}
          </span>

          {/* Icon */}
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: color + "18", border: `1px solid ${color}28` }}
          >
            <Icon size={11} style={{ color }} />
          </div>

          {/* Label + preview */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-white flex-shrink-0">{label}</span>
            {!expanded && (
              <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.28)" }}>
                — {getContentPreview(block)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => onDuplicate(block)}
              className="p-1.5 rounded hover:bg-white/5 transition-colors"
              style={{ color: "rgba(255,255,255,0.2)" }}
              title="Duplicate"
            >
              <Copy size={11} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded hover:bg-white/5 transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <button
              onClick={() => onDelete(block.id)}
              className="p-1.5 rounded hover:bg-red-950/60 transition-colors"
              style={{ color: "rgba(255,255,255,0.2)" }}
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {/* Editor body */}
        {expanded && (
          <div className="p-4">
            {renderEditor()}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Main editor ───────── */

interface Props {
  lessonId: string;
  initialBlocks: ContentBlock[];
}

export default function ContentBlockEditor({ lessonId, initialBlocks }: Props) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const markSaved = useCallback(() => {
    setSaveState("saved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState("idle"), 2200);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setBlocks((prev) => {
        const oldIdx = prev.findIndex((b) => b.id === active.id);
        const newIdx = prev.findIndex((b) => b.id === over.id);
        const reordered = arrayMove(prev, oldIdx, newIdx).map((b, i) => ({ ...b, sort_order: i }));
        const supabase = createClient();
        Promise.all(reordered.map((b) =>
          supabase.from("content_blocks").update({ sort_order: b.sort_order }).eq("id", b.id)
        )).then(markSaved);
        return reordered;
      });
    },
    [markSaved]
  );

  async function addBlock(type: BlockType) {
    setSaveState("saving");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("content_blocks")
      .insert({ lesson_id: lessonId, block_type: type, sort_order: blocks.length, content: getDefaultContent(type) })
      .select()
      .single();
    if (!error && data) {
      setBlocks((prev) => [...prev, data as ContentBlock]);
      markSaved();
    } else {
      setSaveState("idle");
    }
  }

  async function duplicateBlock(block: ContentBlock) {
    setSaveState("saving");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("content_blocks")
      .insert({ lesson_id: lessonId, block_type: block.block_type, sort_order: blocks.length, content: block.content })
      .select()
      .single();
    if (!error && data) {
      setBlocks((prev) => [...prev, data as ContentBlock]);
      markSaved();
    } else {
      setSaveState("idle");
    }
  }

  async function deleteBlock(id: string) {
    if (!confirm("Delete this block?")) return;
    const supabase = createClient();
    await supabase.from("content_blocks").delete().eq("id", id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  const updateBlock = useCallback(
    (id: string, content: Record<string, unknown>) => {
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content: content as unknown as ContentBlock["content"] } : b)));
      setSaveState("saving");
      const supabase = createClient();
      supabase.from("content_blocks").update({ content }).eq("id", id).then(markSaved);
    },
    [markSaved]
  );

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          {blocks.length} block{blocks.length !== 1 ? "s" : ""}
        </span>
        <div
          className="flex items-center gap-1.5 text-xs transition-all"
          style={{ color: saveState === "saved" ? "#4ade80" : "rgba(255,255,255,0.25)" }}
        >
          {saveState === "saving" && <Loader2 size={10} className="animate-spin" />}
          {saveState === "saved"  && <Check size={10} />}
          <span>{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}</span>
        </div>
      </div>

      {/* Block list */}
      {blocks.length === 0 ? (
        <div
          className="text-center py-14 rounded-xl"
          style={{ border: "1px dashed #222" }}
        >
          <div
            className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "#111" }}
          >
            <Plus size={18} style={{ color: "rgba(255,255,255,0.2)" }} />
          </div>
          <p className="text-sm font-medium text-white mb-1">No content yet</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Pick a block type below to start building
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {blocks.map((block, i) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  index={i}
                  onDelete={deleteBlock}
                  onUpdate={updateBlock}
                  onDuplicate={duplicateBlock}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Block picker — always visible */}
      <div
        className="rounded-xl p-3"
        style={{ border: "1px solid #1a1a1a", background: "#080808" }}
      >
        <p className="text-xs px-1 mb-2.5" style={{ color: "rgba(255,255,255,0.22)" }}>
          + Add block
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BLOCK_TYPES.map(({ type, label, desc, Icon: BIcon, color }) => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 hover:bg-white/[0.03]"
              style={{ border: "1px solid #1a1a1a", background: "#0d0d0d" }}
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: color + "15", border: `1px solid ${color}25` }}
              >
                <BIcon size={13} style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.28)" }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
