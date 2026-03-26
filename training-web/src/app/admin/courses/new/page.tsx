import CourseForm from "@/components/admin/CourseForm";

export default function NewCoursePage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Create Course</h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Set up a new training course</p>
      </div>
      <CourseForm />
    </div>
  );
}
