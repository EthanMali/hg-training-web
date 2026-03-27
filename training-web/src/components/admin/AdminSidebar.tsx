"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, Users, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/courses", label: "Courses", icon: BookOpen, exact: false },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col" style={{ borderRight: "1px solid #111", background: "#080808" }}>
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5" style={{ borderBottom: "1px solid #111" }}>
        <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="12" rx="1" fill="black"/>
            <rect x="8" y="1" width="5" height="7" rx="1" fill="black"/>
            <rect x="8" y="10" width="5" height="3" rx="1" fill="black"/>
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-white leading-tight">HG Operator</p>
          <p className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.3)" }}>Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
              style={{
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                color: active ? "#ffffff" : "rgba(255,255,255,0.45)",
              }}
            >
              <link.icon size={15} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3" style={{ borderTop: "1px solid #111" }}>
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/60 transition-colors">
          ← Back to site
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400/60 hover:text-red-400 hover:bg-red-950 transition-colors"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}
