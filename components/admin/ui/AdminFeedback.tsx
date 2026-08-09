import type { ReactNode } from "react";

export function AdminAlert({
  children,
  type = "info"
}: {
  children: ReactNode;
  type?: "success" | "error" | "info" | "warning";
}) {
  const classes = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
    info: "border-brand-softGray bg-white text-brand-charcoal",
    warning: "border-amber-200 bg-amber-50 text-amber-900"
  }[type];

  return (
    <div role={type === "error" ? "alert" : "status"} className={`border p-4 text-sm font-semibold ${classes}`}>
      {children}
    </div>
  );
}

export function AdminLoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="admin-loading-state border border-zinc-200/70 bg-white p-6 sm:p-8" role="status" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="admin-skeleton-block h-4 w-36" aria-hidden="true" />
      <div className="mt-6 grid gap-3" aria-hidden="true">
        <div className="admin-skeleton-block h-12 w-full" />
        <div className="admin-skeleton-block h-12 w-full" />
        <div className="admin-skeleton-block h-12 w-[82%]" />
      </div>
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-brand-softGray bg-brand-offWhite p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-brand-charcoal/60">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function AdminErrorState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-red-200 bg-white p-8 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-brand-charcoal/65">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
