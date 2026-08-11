import { TriangleAlert } from "lucide-react";

export function HisabDisclaimer() {
  return (
    <div className="flex gap-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.07] px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} />
      <p>
        <strong className="font-semibold text-neutral-900 dark:text-neutral-100">
          Hisab only, not an official determination.
        </strong>{" "}
        This is a calculation (hisab) result, not rukyat (observation). Official start of
        Ramadhan/Syawal/Dzulhijjah in Indonesia is determined by Kemenag&apos;s sidang isbat, which may
        incorporate observation reports this tool cannot. Method disagreement is expected and shown
        deliberately.
      </p>
    </div>
  );
}
