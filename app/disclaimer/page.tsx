import { LegalShell } from "@/components/legal-shell";

export const metadata = {
  title: "Disclaimer — Sulphor",
};

export default function DisclaimerPage() {
  return (
    <LegalShell>
      <p className="text-xs font-semibold text-[#9B9590] tracking-[0.15em] uppercase mb-4">
        Last updated: April 2026
      </p>
      <h1 className="font-dm-serif text-4xl sm:text-5xl text-[#2C3340] mb-10 leading-tight">
        Disclaimer
      </h1>

      <div className="prose-style">
        <p>
          Sulphor is a financial organization tool, not a financial advisor.
        </p>
        <p>
          Nothing on this platform — including AI-generated allocation plans, bucket
          suggestions, or any other feature — constitutes tax advice, investment advice,
          legal advice, or accounting guidance. All plans and suggestions are based solely
          on information you provide and are intended for organizational purposes only.
        </p>
        <p>
          Sulphor does not move, hold, or have custody of your money at any time. Bucket
          balances are virtual tracking figures that reflect allocations you have approved.
          They do not represent separate bank accounts or segregated funds.
        </p>
        <p>
          Always consult a qualified tax professional, accountant, or financial advisor
          before making decisions about your finances. Sulphor is not responsible for any
          financial decisions made based on information displayed within the app.
        </p>
      </div>
    </LegalShell>
  );
}
