import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  courseSlug: string;
  courseTitle: string;
  lessonTitle: string;
}

export default function LessonHeader({ courseSlug, courseTitle, lessonTitle }: Props) {
  return (
    <header className="h-12 flex items-center px-4 gap-3 flex-shrink-0" style={{ borderBottom: "1px solid #111", background: "rgba(8,8,8,0.9)", backdropFilter: "blur(8px)" }}>
      <Link
        href={`/courses/${courseSlug}`}
        className="flex items-center gap-1.5 text-xs transition-colors flex-shrink-0"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        <ArrowLeft size={12} /> <span className="hidden sm:inline truncate max-w-[140px]">{courseTitle}</span>
      </Link>
      <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
      <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.6)" }}>{lessonTitle}</span>
    </header>
  );
}
