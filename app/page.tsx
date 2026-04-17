import Link from "next/link";
import { DashboardMockup } from "@/components/landing-mockup";

const painPoints = [
  "Your payout hit but you spent some before setting aside for taxes.",
  "You've been meaning to pay yourself properly, but never know how much is safe.",
  "There's money in Stripe but you can't tell what's actually free to spend.",
];

const steps = [
  {
    n: "01",
    title: "Connect Stripe",
    desc: "OAuth in 30 seconds. Read-only access. No credentials stored, no money movement.",
  },
  {
    n: "02",
    title: "Set your buckets",
    desc: "Define how each payout splits. Pre-filled defaults to start. Percentages, fixed amounts, or remainder.",
  },
  {
    n: "03",
    title: "Approve & track",
    desc: "Every payout generates a line-by-line plan. Approve in one click. Reserves build automatically.",
  },
];

const features = [
  {
    tag: "Tax Holdback",
    title: "Automatic splits",
    desc: "Every payout divided the moment it syncs. Your tax bucket fills before you touch anything.",
  },
  {
    tag: "Virtual Reserves",
    title: "No second bank account",
    desc: "Tax Holdback, Owner Pay, Savings — all tracked virtually against your real Stripe balance.",
  },
  {
    tag: "AI Planner",
    title: "Tell it your situation",
    desc: "Describe your business in plain English. Get a tailored bucket plan in seconds.",
  },
  {
    tag: "Full History",
    title: "Every decision on record",
    desc: "Complete payout log with each allocation visible. Know exactly how reserves built up.",
  },
];

const aiFrames = [
  {
    label: "You write",
    labelColor: "text-[#9B9590]",
    content: (
      <p className="text-[#5C5852] text-sm leading-relaxed">
        &ldquo;I&rsquo;m a freelancer earning ~$8k/month in Stripe. I need to handle taxes (around 30%) and want to pay myself $3,000/month consistently.&rdquo;
      </p>
    ),
    border: "border-[#E8E4DF]",
  },
  {
    label: "Sulphor asks",
    labelColor: "text-[#9B9590]",
    content: (
      <p className="text-[#5C5852] text-sm leading-relaxed">
        Got it. One follow-up — do you have recurring business costs like ads or software you&rsquo;d want to set aside for each payout?
      </p>
    ),
    border: "border-[#E8E4DF]",
  },
  {
    label: "Your plan",
    labelColor: "text-[#E8A838]",
    content: (
      <div className="space-y-0">
        {[
          { label: "Tax Holdback", value: "30%" },
          { label: "Owner Pay", value: "$3,000" },
          { label: "Ad Spend", value: "10%" },
          { label: "Operating Buffer", value: "5%" },
          { label: "Savings", value: "Remainder" },
        ].map((r) => (
          <div
            key={r.label}
            className="flex justify-between text-sm py-2 border-b border-[#F0EDE8] last:border-0"
          >
            <span className="text-[#5C5852]">{r.label}</span>
            <span className="font-medium text-[#2C3340]">{r.value}</span>
          </div>
        ))}
      </div>
    ),
    border: "border-[#E8A838]/40",
  },
];

const pricingBullets = [
  "Unlimited payouts processed",
  "Automatic bucket splits",
  "AI payout planner",
  "Full allocation history",
  "Read-only Stripe connection",
];

export default function LandingPage() {
  return (
    <div className="font-inter bg-[#FAFAF8] text-[#2C3340] min-h-screen">
      {/* ── Nav ── */}
      <header className="border-b border-[#E8E4DF] px-6 py-4 sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-dm-serif text-xl text-[#2C3340]">Sulphor</span>

          <nav className="hidden sm:flex items-center gap-6 text-sm text-[#7C7168]">
            <Link href="/pricing" className="hover:text-[#2C3340] transition-colors">
              Pricing
            </Link>
            <Link href="#contact" className="hover:text-[#2C3340] transition-colors">
              Contact
            </Link>
            <Link href="#disclaimer" className="hover:text-[#2C3340] transition-colors">
              Disclaimer
            </Link>
            <Link href="/login" className="hover:text-[#2C3340] transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-[#2C3340] text-white text-xs font-medium px-4 py-2 rounded-full hover:bg-[#3d4755] transition-colors"
            >
              Get started
            </Link>
          </nav>

          {/* Mobile */}
          <div className="sm:hidden flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#7C7168]">
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-[#2C3340] text-white text-xs font-medium px-4 py-2 rounded-full"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 lg:pt-28 lg:pb-24">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Copy */}
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-[#E8A838] tracking-[0.15em] uppercase mb-5">
              Financial clarity for Stripe businesses
            </p>
            <h1 className="font-dm-serif text-[40px] sm:text-[56px] lg:text-[64px] leading-[1.08] text-[#2C3340] mb-6">
              A financial layer for your Stripe revenue.
            </h1>
            <p className="text-lg text-[#7C7168] leading-relaxed mb-8 max-w-[480px]">
              Connect Stripe and every payout gets automatically split into
              buckets — taxes, owner pay, savings, ad spend. No spreadsheets.
              No guessing.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link
                href="/signup"
                className="bg-[#2C3340] text-white font-medium px-7 py-3.5 rounded-full text-sm hover:bg-[#3d4755] transition-colors text-center w-full sm:w-auto"
              >
                Connect Stripe
              </Link>
              <a
                href="#how-it-works"
                className="border border-[#DDD8D0] text-[#5C5852] font-medium px-7 py-3.5 rounded-full text-sm hover:border-[#2C3340] hover:text-[#2C3340] transition-colors text-center w-full sm:w-auto"
              >
                See how it works ↓
              </a>
            </div>
            <p className="text-xs text-[#9B9590]">
              Read-only access · No money moved · Cancel anytime
            </p>
          </div>

          {/* Floating mockup */}
          <div className="flex-1 w-full flex justify-center lg:justify-end">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── Pain ── */}
      <section className="bg-[#F7F5F2] border-y border-[#E8E4DF] py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-[#9B9590] tracking-[0.15em] uppercase text-center mb-10">
            Sound familiar?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {painPoints.map((text) => (
              <div
                key={text}
                className="bg-white border border-[#E8E4DF] rounded-2xl px-6 py-5"
              >
                <p className="text-[#5C5852] text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-dm-serif text-3xl sm:text-4xl text-[#2C3340]">
            Three steps. Then it runs itself.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((s) => (
            <div key={s.n}>
              <p className="font-mono text-xs font-semibold text-[#E8A838] tracking-widest mb-3">
                {s.n}
              </p>
              <p className="font-semibold text-[#2C3340] mb-2">{s.title}</p>
              <p className="text-sm text-[#7C7168] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-[#F7F5F2] border-y border-[#E8E4DF] py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-dm-serif text-3xl sm:text-4xl text-[#2C3340]">
              Your revenue, divided before you touch it.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-[#E8E4DF] rounded-2xl p-6"
              >
                <span className="inline-block text-xs font-medium text-[#E8A838] bg-[#E8A838]/10 px-2.5 py-1 rounded-full mb-4">
                  {f.tag}
                </span>
                <p className="font-semibold text-[#2C3340] mb-2">{f.title}</p>
                <p className="text-sm text-[#7C7168] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Planner ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-dm-serif text-3xl sm:text-4xl text-[#2C3340] mb-3">
            Tell it your situation. It builds the plan.
          </h2>
          <p className="text-[#9B9590] text-sm">
            Describe your business once. Get a recommended bucket plan.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiFrames.map((frame, i) => (
            <div
              key={i}
              className={`border ${frame.border} rounded-2xl p-5 bg-white`}
            >
              <p
                className={`text-[10px] font-semibold ${frame.labelColor} uppercase tracking-[0.15em] mb-3`}
              >
                {frame.label}
              </p>
              <div className="bg-[#F7F5F2] rounded-xl p-4">{frame.content}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="bg-[#F7F5F2] border-y border-[#E8E4DF] py-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] font-semibold text-[#9B9590] tracking-[0.15em] uppercase mb-6">
            Works with
          </p>
          <div className="flex items-center justify-center mb-4">
            <div className="inline-flex items-center gap-2 bg-[#635BFF]/10 border border-[#635BFF]/20 rounded-xl px-5 py-2.5">
              <div className="w-5 h-5 bg-[#635BFF] rounded flex items-center justify-center">
                <span className="text-white text-[9px] font-bold">S</span>
              </div>
              <span className="font-bold text-[#635BFF] text-base tracking-tight">
                stripe
              </span>
            </div>
          </div>
          <p className="text-sm text-[#7C7168]">
            Built for businesses that run on Stripe.
          </p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="font-dm-serif text-3xl sm:text-4xl text-[#2C3340] mb-3">
          Simple, honest pricing.
        </h2>
        <p className="text-[#7C7168] text-sm mb-12">One plan. Everything included.</p>
        <div className="border-2 border-[#2C3340] rounded-3xl p-8 text-left max-w-sm mx-auto">
          <p className="text-[10px] font-semibold text-[#9B9590] uppercase tracking-[0.15em] mb-1">
            Standard
          </p>
          <div className="flex items-end gap-1 mb-7">
            <span className="text-4xl font-bold text-[#2C3340]">$11.99</span>
            <span className="text-[#9B9590] text-sm mb-1">/month</span>
          </div>
          <ul className="space-y-3 mb-8">
            {pricingBullets.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-[#5C5852]">
                <span className="text-[#E8A838] font-bold text-base leading-none flex-shrink-0">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="block w-full bg-[#2C3340] text-white text-sm font-medium py-3.5 rounded-full text-center hover:bg-[#3d4755] transition-colors"
          >
            Get started
          </Link>
          <p className="text-xs text-[#9B9590] text-center mt-3">
            Cancel anytime. No contracts.
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-[#2C3340] py-24 px-6 text-center">
        <h2 className="font-dm-serif text-3xl sm:text-5xl text-white mb-10 max-w-xl mx-auto leading-tight">
          Your next payout deserves a plan.
        </h2>
        <Link
          href="/signup"
          className="inline-block bg-[#E8A838] text-[#2C3340] font-semibold px-10 py-4 rounded-full text-base hover:bg-[#d4952e] transition-colors"
        >
          Connect Stripe — it&apos;s free
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer
        id="disclaimer"
        className="border-t border-[#E8E4DF] bg-[#FAFAF8] py-8 px-6"
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9B9590]">
          <span className="font-dm-serif text-base text-[#2C3340]">Sulphor</span>
          <div className="flex items-center gap-5">
            <Link href="#" className="hover:text-[#2C3340] transition-colors">
              Terms
            </Link>
            <Link href="#" className="hover:text-[#2C3340] transition-colors">
              Privacy
            </Link>
            <Link
              id="contact"
              href="mailto:hello@sulphor.com"
              className="hover:text-[#2C3340] transition-colors"
            >
              Contact
            </Link>
          </div>
          <p>Not a bank · Read-only Stripe · No money moved</p>
        </div>
      </footer>
    </div>
  );
}
