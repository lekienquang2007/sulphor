import Link from "next/link";

export function LegalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-inter bg-[#FAFAF8] text-[#2C3340] min-h-screen">
      {/* Nav */}
      <header className="border-b border-[#E8E4DF] px-6 py-4 sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-dm-serif text-xl text-[#2C3340] hover:opacity-80 transition-opacity">
            Sulphor
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-[#7C7168]">
            <Link href="/pricing" className="hover:text-[#2C3340] transition-colors">Pricing</Link>
            <Link href="mailto:hello@sulphor.com" className="hover:text-[#2C3340] transition-colors">Contact</Link>
            <Link href="/disclaimer" className="hover:text-[#2C3340] transition-colors">Disclaimer</Link>
            <Link href="/login" className="hover:text-[#2C3340] transition-colors">Log in</Link>
            <Link
              href="/signup"
              className="bg-[#2C3340] text-white text-xs font-medium px-4 py-2 rounded-full hover:bg-[#3d4755] transition-colors"
            >
              Get started
            </Link>
          </nav>
          <div className="sm:hidden flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#7C7168]">Log in</Link>
            <Link href="/signup" className="bg-[#2C3340] text-white text-xs font-medium px-4 py-2 rounded-full">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[680px] mx-auto px-6 py-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E4DF] bg-[#FAFAF8] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9B9590]">
          <Link href="/" className="font-dm-serif text-base text-[#2C3340]">Sulphor</Link>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-[#2C3340] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[#2C3340] transition-colors">Privacy</Link>
            <Link href="/disclaimer" className="hover:text-[#2C3340] transition-colors">Disclaimer</Link>
            <Link href="mailto:hello@sulphor.com" className="hover:text-[#2C3340] transition-colors">Contact</Link>
          </div>
          <p>Not a bank · No money moved</p>
        </div>
      </footer>
    </div>
  );
}
