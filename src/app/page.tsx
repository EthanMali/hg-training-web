import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import Badge from "@/components/ui/Badge";
import { ArrowRight, Zap, BookOpen, Award, Sliders, Users } from "lucide-react";
import type { Course } from "@/types";

export default async function Home() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("sort_order")
    .limit(3);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="grid-pattern absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080808]" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(255,255,255,0.03)" }} />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-24 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-white/10 text-xs" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              House of God — Operator Training
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-none mb-6">
              HG Operator
              <br />
              <span className="gradient-text">Training Hub</span>
            </h1>

            <p className="max-w-lg mx-auto text-lg leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.5)" }}>
              Internal training for House of God operators. Learn the gear, the process, and how we do things — at your own pace.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                View courses <ArrowRight size={16} />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm border transition-colors"
                style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.1)" }}
              >
                Create account
              </Link>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-20" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-2">Built for operators, by operators</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Everything you need to get trained up and stay sharp.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Sliders, title: "Interactive Diagrams", desc: "Click through gear diagrams to understand exactly what every control does and why." },
                { icon: Zap, title: "Knowledge Checks", desc: "Quick quizzes after each lesson so you actually retain what you just learned." },
                { icon: BookOpen, title: "Structured Courses", desc: "Courses cover everything from console basics to full service operation — more added over time." },
                { icon: Award, title: "Track Your Progress", desc: "Pick up exactly where you left off. See what you've completed at a glance." },
                { icon: Users, title: "Service-Ready Scenarios", desc: "Training is built around real HG service scenarios, not generic textbook examples." },
                { icon: ArrowRight, title: "Always Growing", desc: "New courses and lessons get added as the team grows and gear changes." },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-xl"
                  style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <feature.icon size={18} style={{ color: "rgba(255,255,255,0.6)" }} />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Course preview */}
        {courses && courses.length > 0 && (
          <section className="py-20" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Available Courses</h2>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Jump in wherever makes sense for you</p>
                </div>
                <Link href="/courses" className="hidden sm:flex items-center gap-1 text-sm transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
                  See all <ArrowRight size={14} />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(courses as Course[]).map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="group p-6 rounded-xl flex flex-col gap-4 transition-all duration-200"
                    style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Badge variant={course.difficulty as "beginner" | "intermediate" | "advanced"}>
                        {course.difficulty}
                      </Badge>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{course.estimated_minutes}m</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base mb-1">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm line-clamp-2" style={{ color: "rgba(255,255,255,0.4)" }}>{course.description}</p>
                      )}
                    </div>
                    <div className="mt-auto flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Open course <ArrowRight size={12} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Sign up prompt */}
        <section className="py-20" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">New to the team?</h2>
            <p className="mb-7 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
              Create an account to access all training courses and track your progress as you go.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              Create account <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
