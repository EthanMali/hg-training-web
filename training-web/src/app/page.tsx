import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import Badge from "@/components/ui/Badge";
import { ArrowRight, Sliders, BookOpen, CheckCircle2 } from "lucide-react";
import type { Course } from "@/types";
import SoundBars from "@/components/landing/SoundBars";
import FadeIn from "@/components/landing/FadeIn";

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

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden">
          {/* Breathing glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255,255,255,0.04) 0%, transparent 70%)",
              animation: "glow-pulse 6s ease-in-out infinite",
            }}
          />

          {/* Dot grid, masked to center */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)",
            }}
          />

          <div className="relative z-10 max-w-3xl mx-auto px-6 text-center flex flex-col items-center gap-8 pt-10">

            {/* Eyebrow */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.45)",
                animation: "fadeIn 0.6s ease both",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              House of God — Sound &amp; Media Team
            </div>

            {/* Animated sound bars */}
            <div className="opacity-60">
              <SoundBars count={20} />
            </div>

            {/* Headline */}
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]"
              style={{ animation: "fadeIn 0.7s ease 0.1s both" }}
            >
              Equipped<br />
              <span className="gradient-text">to Serve.</span>
            </h1>

            {/* Sub */}
            <p
              className="max-w-md text-base sm:text-lg leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.45)",
                animation: "fadeIn 0.7s ease 0.25s both",
              }}
            >
              Operator training for the House of God sound &amp; media team — learn the gear, the craft, and how we do things.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-wrap items-center justify-center gap-3"
              style={{ animation: "fadeIn 0.7s ease 0.4s both" }}
            >
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                Sign in <ArrowRight size={15} />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-colors"
                style={{ color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Create account
              </Link>
            </div>
          </div>

          {/* Fade to background */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, #080808)" }}
          />
        </section>

        {/* ── SCRIPTURE ────────────────────────────────────────── */}
        <section
          className="py-16 relative overflow-hidden"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 70%)" }}
          />
          <FadeIn className="max-w-2xl mx-auto px-6 text-center relative z-10">
            <p className="text-xs uppercase tracking-[0.2em] mb-5" style={{ color: "rgba(255,255,255,0.2)" }}>
              Our foundation
            </p>
            <blockquote
              className="text-xl sm:text-2xl font-light leading-relaxed"
              style={{ color: "rgba(255,255,255,0.75)", fontStyle: "italic" }}
            >
              &ldquo;Whatever you do, work at it with all your heart,
              as working for the Lord, not for human masters.&rdquo;
            </blockquote>
            <cite className="block mt-5 text-sm not-italic" style={{ color: "rgba(255,255,255,0.3)" }}>
              — Colossians 3:23
            </cite>
          </FadeIn>
        </section>

        {/* ── WHAT YOU GET ─────────────────────────────────────── */}
        <section className="py-20" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="max-w-5xl mx-auto px-6">
            <FadeIn>
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                Everything you need to get ready for Sunday
              </h2>
              <p className="text-sm text-center mb-12" style={{ color: "rgba(255,255,255,0.35)" }}>
                Built around real HG service scenarios, not generic textbook examples.
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                {
                  icon: BookOpen,
                  title: "Structured Courses",
                  desc: "From console basics to full service operation — every topic covered step by step, at your own pace.",
                  delay: 0,
                },
                {
                  icon: Sliders,
                  title: "Hands-On Labs",
                  desc: "Real interactive audio tools — drag an EQ band and hear it, tweak a compressor and see the curve change live.",
                  delay: 80,
                },
                {
                  icon: CheckCircle2,
                  title: "Track Your Progress",
                  desc: "Pick up exactly where you left off. See completed lessons and know what comes next before you step into the booth.",
                  delay: 160,
                },
              ].map((item) => (
                <FadeIn key={item.title} delay={item.delay}>
                  <div
                    className="p-6 rounded-xl h-full flex flex-col gap-4"
                    style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <item.icon size={18} style={{ color: "rgba(255,255,255,0.55)" }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1.5">{item.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── COURSES PREVIEW ──────────────────────────────────── */}
        {courses && courses.length > 0 && (
          <section className="py-20" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="max-w-5xl mx-auto px-6">
              <FadeIn>
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Available Courses</h2>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Assigned by your admin once you join
                    </p>
                  </div>
                  <Link
                    href="/courses"
                    className="hidden sm:flex items-center gap-1 text-xs"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    See all <ArrowRight size={12} />
                  </Link>
                </div>
              </FadeIn>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(courses as Course[]).map((course, i) => (
                  <FadeIn key={course.id} delay={i * 80}>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="group flex flex-col rounded-xl overflow-hidden h-full transition-all duration-200"
                      style={{ border: "1px solid #1a1a1a", background: "#0a0a0a" }}
                    >
                      {course.thumbnail_url ? (
                        <div className="w-full aspect-video overflow-hidden">
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-full aspect-video flex items-center justify-center"
                          style={{ background: "#0d0d0d" }}
                        >
                          <SoundBars count={12} />
                        </div>
                      )}
                      <div className="p-5 flex flex-col flex-1 gap-3">
                        <div className="flex items-center justify-between">
                          <Badge variant={course.difficulty as "beginner" | "intermediate" | "advanced"}>
                            {course.difficulty}
                          </Badge>
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                            {course.estimated_minutes}m
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-sm mb-1">{course.title}</h3>
                          {course.description && (
                            <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                              {course.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                          View course <ArrowRight size={11} />
                        </div>
                      </div>
                    </Link>
                  </FadeIn>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── PSALM ────────────────────────────────────────────── */}
        <section className="py-16" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <FadeIn className="max-w-xl mx-auto px-6 text-center">
            <blockquote
              className="text-lg font-light leading-relaxed mb-3"
              style={{ color: "rgba(255,255,255,0.55)", fontStyle: "italic" }}
            >
              &ldquo;Sing to him a new song; play skillfully, and shout for joy.&rdquo;
            </blockquote>
            <cite className="text-xs not-italic" style={{ color: "rgba(255,255,255,0.25)" }}>
              — Psalm 33:3
            </cite>
          </FadeIn>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="py-24" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <FadeIn className="max-w-xl mx-auto px-6 text-center">
            <p className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
              New to the team?
            </p>
            <h2 className="text-3xl font-bold text-white mb-4">Start your training today.</h2>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.38)" }}>
              Create an account and your admin will assign you courses to get started.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-white text-black px-7 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                Create account <ArrowRight size={15} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm transition-colors"
                style={{ color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Sign in
              </Link>
            </div>
          </FadeIn>
        </section>

      </main>
      <Footer />
    </>
  );
}
