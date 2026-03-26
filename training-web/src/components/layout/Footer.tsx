import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[#111] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="12" rx="1" fill="black"/>
                <rect x="8" y="1" width="5" height="7" rx="1" fill="black"/>
                <rect x="8" y="10" width="5" height="3" rx="1" fill="black"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-white/70">HG Operator Training</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/courses" className="text-sm text-white/30 hover:text-white/60 transition-colors">Courses</Link>
            <Link href="/dashboard" className="text-sm text-white/30 hover:text-white/60 transition-colors">Dashboard</Link>
            <Link href="/login" className="text-sm text-white/30 hover:text-white/60 transition-colors">Sign in</Link>
          </nav>
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} HG Operator Training
          </p>
        </div>
      </div>
    </footer>
  );
}
