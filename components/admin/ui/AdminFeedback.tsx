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
    <div className="border border-brand-softGray bg-white p-8 text-center text-sm font-medium text-brand-charcoal/60">
      {label}
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
