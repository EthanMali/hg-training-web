import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#111] bg-[rgba(8,8,8,0.9)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="12" rx="1" fill="black"/>
              <rect x="8" y="1" width="5" height="7" rx="1" fill="black"/>
              <rect x="8" y="10" width="5" height="3" rx="1" fill="black"/>
            </svg>
          </div>
          <span className="font-semibold text-sm text-white tracking-tight">
            HG <span className="text-white/40">Operator</span>
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/courses" className="px-3 py-1.5 text-sm text-white/50 hover:text-white rounded-md hover:bg-white/5 transition-colors">
            Courses
          </Link>
          {profile?.role === "admin" && (
            <Link href="/admin" className="px-3 py-1.5 text-sm text-white/50 hover:text-white rounded-md hover:bg-white/5 transition-colors">
              Admin
            </Link>
          )}
        </nav>

        {/* Auth area */}
        <NavbarClient user={user} profile={profile} />
      </div>
    </header>
  );
}
