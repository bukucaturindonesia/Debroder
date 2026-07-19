import type { ReactNode } from "react";
import type { CustomerOrderPresentation } from "@/lib/customer-order-presentation";

const TONE_STYLES = {
  action: {
    shell: "border-amber-200 bg-amber-50",
    badge: "bg-amber-950 text-white",
    muted: "text-amber-950/65",
    rail: "border-amber-300"
  },
  processing: {
    shell: "border-blue-200 bg-blue-50",
    badge: "bg-blue-950 text-white",
    muted: "text-blue-950/65",
    rail: "border-blue-200"
  },
  success: {
    shell: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-950 text-white",
    muted: "text-emerald-950/65",
    rail: "border-emerald-200"
  },
  warning: {
    shell: "border-red-200 bg-red-50",
    badge: "bg-red-950 text-white",
    muted: "text-red-950/65",
    rail: "border-red-200"
  }
} as const;

export function CustomerOrderStatusCard({
  presentation,
  primaryAction,
  secondaryAction,
  children
}: {
  presentation: CustomerOrderPresentation;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  children?: ReactNode;
}) {
  const styles = TONE_STYLES[presentation.tone];

  return (
    <section className={`rounded-[28px] border p-5 sm:p-7 ${styles.shell}`}>
      <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] ${styles.badge}`}>
        {presentation.responsibilityLabel}
      </span>
      <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">{presentation.title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-black/65">{presentation.description}</p>

      {children ? <div className={`mt-5 border-t pt-5 ${styles.rail}`}>{children}</div> : null}

      {(primaryAction || secondaryAction) ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}

      <div className={`mt-6 border-t pt-5 ${styles.rail}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${styles.muted}`}>Berikutnya</p>
        <p className="mt-2 text-sm leading-6 text-black/65">{presentation.nextStep}</p>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-3" aria-label="Ringkasan tahapan pesanan">
        <ProgressStep state="done" label={presentation.previousStage} />
        <ProgressStep state="current" label={presentation.currentStage} />
        <ProgressStep state="next" label={presentation.nextStage} />
      </div>
    </section>
  );
}

function ProgressStep({ state, label }: { state: "done" | "current" | "next"; label: string }) {
  const marker = state === "done" ? "✓" : state === "current" ? "●" : "○";
  const stateLabel = state === "done" ? "Sebelumnya" : state === "current" ? "Saat ini" : "Berikutnya";
  return (
    <div className={`rounded-2xl border px-4 py-3 ${state === "current" ? "border-black bg-black text-white" : "border-black/10 bg-white/65"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${state === "current" ? "text-white/60" : "text-black/40"}`}>
        {marker} {stateLabel}
      </p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
    </div>
  );
}
