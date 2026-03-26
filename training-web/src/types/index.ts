export type UserRole = "student" | "admin";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type BlockType = "text" | "video" | "image" | "diagram" | "quiz" | "callout" | "interactive";
export type CalloutVariant = "tip" | "warning" | "info" | "note";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  difficulty: Difficulty;
  estimated_minutes: number;
  is_published: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  estimated_minutes: number;
  created_at: string;
  updated_at: string;
}

// Block content types
export interface TextBlockContent { html: string; }
export interface VideoBlockContent { url: string; caption?: string; }
export interface ImageBlockContent { url: string; alt: string; caption?: string; }
export interface DiagramHotspot {
  id: string;
  x: number; y: number;
  width: number; height: number;
  label: string;
  description: string;
}
export interface DiagramBlockContent { svg_key: string; hotspots: DiagramHotspot[]; }
export interface QuizOption { text: string; }
export interface QuizBlockContent {
  question: string;
  options: QuizOption[];
  correct_index: number;
  explanation: string;
}
export interface CalloutBlockContent { variant: CalloutVariant; body: string; }

export type InteractiveSubtype = "eq" | "compressor" | "reverb" | "panner" | "delay" | "gate" | "signal_flow";
export interface InteractiveBlockContent {
  subtype: InteractiveSubtype;
  title?: string;
  description?: string;
  audioUrl?: string;
}

export type BlockContent =
  | TextBlockContent
  | VideoBlockContent
  | ImageBlockContent
  | DiagramBlockContent
  | QuizBlockContent
  | CalloutBlockContent
  | InteractiveBlockContent;

export interface ContentBlock {
  id: string;
  lesson_id: string;
  block_type: BlockType;
  sort_order: number;
  content: BlockContent;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  completed: boolean;
  completed_at: string | null;
  last_visited: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  content_block_id: string;
  selected_index: number;
  is_correct: boolean;
  attempted_at: string;
}

// Composite types
export interface CourseWithProgress extends Course {
  total_lessons: number;
  completed_lessons: number;
  enrollment?: Enrollment;
}

export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress;
}
