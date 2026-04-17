import { LegalShell } from "@/components/legal-shell";

export const metadata = {
  title: "Terms of Service — Sulphor",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="font-dm-serif text-2xl text-[#2C3340] mb-4">{title}</h2>
      <div className="prose-style">{children}</div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <LegalShell>
      <p className="text-xs font-semibold text-[#9B9590] tracking-[0.15em] uppercase mb-4">
        Last updated: April 2026
      </p>
      <h1 className="font-dm-serif text-4xl sm:text-5xl text-[#2C3340] mb-4 leading-tight">
        Terms of Service
      </h1>
      <p className="text-[#7C7168] mb-12 leading-relaxed">
        By using Sulphor, you agree to these terms. If you do not agree, do not use the service.
      </p>

      <Section title="What Sulphor is">
        <p>
          Sulphor is a payout organization tool that connects to your Stripe account in read-only
          mode via Stripe Connect. We help you track and virtually allocate incoming Stripe payouts
          into buckets you define. We do not move money, initiate transfers, or have the ability to
          act on your Stripe account in any way.
        </p>
      </Section>

      <Section title="Virtual allocation">
        <p>
          Bucket balances shown in Sulphor are virtual tracking figures only. They reflect
          allocations you have approved and do not represent separate bank accounts, held funds,
          or legally segregated money. Sulphor is not a bank or financial institution.
        </p>
      </Section>

      <Section title="Not financial advice">
        <p>
          AI-generated allocation plans and bucket suggestions are for organizational purposes
          only. They do not constitute tax, legal, investment, or financial advice. You are
          solely responsible for your financial decisions.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You are responsible for maintaining the security of your account. You must provide
          accurate information when signing up. You may not use Sulphor for any unlawful purpose.
        </p>
      </Section>

      <Section title="Stripe connection">
        <p>
          By connecting your Stripe account, you authorize Sulphor to read payout data via Stripe
          Connect. You can disconnect at any time from your Sulphor settings or directly from your
          Stripe dashboard.
        </p>
      </Section>

      <Section title="Cancellation and deletion">
        <p>
          You can cancel your subscription and delete your account at any time. Upon deletion,
          your data is removed from our systems within 30 days. Cancellation takes effect at
          the end of your current billing period.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          Sulphor is provided as-is. To the fullest extent permitted by law, we are not liable
          for any indirect, incidental, or consequential damages arising from your use of the service.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms from time to time. Continued use of Sulphor after changes
          means you accept the updated terms. We will notify you of significant changes via email.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms? Reach out at the contact information listed on our website.
        </p>
      </Section>
    </LegalShell>
  );
}
