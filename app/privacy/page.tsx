import { LegalShell } from "@/components/legal-shell";

export const metadata = {
  title: "Privacy Policy — Sulphor",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="font-dm-serif text-2xl text-[#2C3340] mb-4">{title}</h2>
      <div className="prose-style">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <LegalShell>
      <p className="text-xs font-semibold text-[#9B9590] tracking-[0.15em] uppercase mb-4">
        Last updated: April 2026
      </p>
      <h1 className="font-dm-serif text-4xl sm:text-5xl text-[#2C3340] mb-4 leading-tight">
        Privacy Policy
      </h1>
      <p className="text-[#7C7168] mb-12 leading-relaxed">
        This policy explains what data Sulphor collects, why, and how it is handled.
      </p>

      <Section title="What we collect">
        <ul>
          <li>
            <strong>Account information:</strong> Your name and email address, collected when
            you sign up.
          </li>
          <li>
            <strong>Stripe data:</strong> Payout amounts, payout dates, and your Stripe account
            ID — accessed via Stripe Connect in read-only mode. We do not collect or store bank
            account numbers, card numbers, or any payment credentials.
          </li>
          <li>
            <strong>App data:</strong> Bucket names, allocation rules, and payout plans you
            create within Sulphor. This is stored to provide the service.
          </li>
          <li>
            <strong>Usage data:</strong> Basic information about how you use the app, such as
            feature interactions and page views, used to improve the product.
          </li>
        </ul>
      </Section>

      <Section title="What we do not collect">
        <p>
          We do not collect Social Security numbers, tax IDs, bank credentials, card numbers,
          or any sensitive financial identifiers. We do not sell your data to anyone, ever.
        </p>
      </Section>

      <Section title="How we use your data">
        <p>
          To provide and improve Sulphor. To send you account-related emails (receipts,
          important notices). We do not use your data for advertising.
        </p>
      </Section>

      <Section title="Who we share it with">
        <ul>
          <li><strong>Stripe:</strong> To facilitate the Stripe Connect integration.</li>
          <li><strong>Vercel:</strong> Our hosting provider, where the app runs.</li>
          <li><strong>Supabase:</strong> Where your app data is stored.</li>
        </ul>
        <p>We do not share your data with any other third parties.</p>
      </Section>

      <Section title="Data retention">
        <p>
          We retain your data for as long as your account is active. If you delete your
          account, your data is removed within 30 days.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can request a copy of your data, ask us to correct it, or request deletion
          at any time by contacting us. You can disconnect your Stripe account at any time
          from within Sulphor or directly from your Stripe dashboard.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We use industry-standard practices to protect your data. Stripe connections are
          handled via OAuth — we never see or store your Stripe login credentials.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy as the product evolves. We will notify you of significant
          changes via email.
        </p>
      </Section>
    </LegalShell>
  );
}
