"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, User, ChevronDown, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Props {
  user: SupabaseUser | null;
  profile: { role: string; full_name: string | null; avatar_url: string | null } | null;
}

export default function NavbarClient({ user, profile }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/5">
          Sign in
        </Link>
        <Link href="/register" className="text-sm bg-white text-black px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100 transition-colors">
          Get started
        </Link>
      </div>
    );
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-semibold text-white">
          {initials}
        </div>
        <span className="text-sm text-white/60 hidden sm:block max-w-[120px] truncate">
          {profile?.full_name || user.email}
        </span>
        <ChevronDown size={14} className="text-white/40" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 z-50 rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-3 py-2.5 border-b border-[#1a1a1a]">
              <p className="text-xs text-white/40 truncate">{user.email}</p>
            </div>
            <div className="p-1">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <User size={14} /> Profile
              </Link>
              {profile?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-amber-400/80 hover:text-amber-400 hover:bg-amber-950/30 transition-colors"
                >
                  <Shield size={14} /> Admin Panel
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400/80 hover:text-red-400 hover:bg-red-950 transition-colors"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
