import type { ReactNode } from "react";
import type { CustomerOrderPresentation } from "@/lib/customer-order-presentation";

const TONE_STYLES = {
  action: { shell: "border-amber-200 bg-amber-50", badge: "bg-amber-950 text-white", muted: "text-amber-950/65", rail: "border-amber-300" },
  processing: { shell: "border-blue-200 bg-blue-50", badge: "bg-blue-950 text-white", muted: "text-blue-950/65", rail: "border-blue-200" },
  success: { shell: "border-emerald-200 bg-emerald-50", badge: "bg-emerald-950 text-white", muted: "text-emerald-950/65", rail: "border-emerald-200" },
  warning: { shell: "border-red-200 bg-red-50", badge: "bg-red-950 text-white", muted: "text-red-950/65", rail: "border-red-200" }
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
    <section className={`border p-5 sm:p-7 ${styles.shell}`}>
      <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] ${styles.badge}`}>
        {presentation.responsibilityLabel}
      </span>
      <h2 className="mt-4 break-words text-2xl font-semibold sm:text-3xl">{presentation.title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-black/65">{presentation.description}</p>

      {children ? <div className={`mt-5 border-t pt-5 ${styles.rail}`}>{children}</div> : null}

      {(primaryAction || secondaryAction) ? (
        <div className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}

      <div className={`mt-6 border-t pt-5 ${styles.rail}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${styles.muted}`}>Berikutnya</p>
        <p className="mt-2 text-sm leading-6 text-black/65">{presentation.nextStep}</p>
      </div>

      <div className="mt-7 border-t border-black/10 pt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">Perjalanan Pesanan</p>
            <h3 className="mt-1 text-xl font-semibold">Status sejak checkout</h3>
          </div>
          <p className="max-w-md text-sm leading-6 text-black/55">Tahap disusun dari awal sampai selesai agar Anda selalu tahu posisi pesanan saat ini.</p>
        </div>

        <ol className="mt-5 grid gap-3" aria-label="Perjalanan lengkap pesanan">
          {presentation.journey.map((step) => {
            const current = step.state === "current" || step.state === "stopped";
            return (
              <li key={step.id} className={`grid min-w-0 gap-3 border p-4 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center ${current ? "border-black bg-white" : "border-black/10 bg-white/65"}`} aria-current={current ? "step" : undefined}>
                <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold ${step.state === "done" ? "bg-emerald-100 text-emerald-900" : current ? "bg-black text-white" : step.state === "skipped" ? "bg-black/5 text-black/30" : "bg-black/5 text-black/40"}`}>
                  {step.state === "done" ? "✓" : step.position}
                </span>
                <div className="min-w-0">
                  <p className="break-words font-semibold">{step.label}</p>
                  <p className="mt-1 break-words text-sm leading-6 text-black/55">{step.description}</p>
                </div>
                <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${step.state === "done" ? "bg-emerald-50 text-emerald-800" : current ? "bg-black text-white" : step.state === "skipped" ? "bg-black/5 text-black/35" : "bg-black/5 text-black/45"}`}>
                  {step.state === "done" ? "Selesai" : step.state === "current" ? "Saat Ini" : step.state === "stopped" ? "Dihentikan" : step.state === "skipped" ? "Tidak Dilanjutkan" : "Berikutnya"}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
