import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-page-header min-w-0 border border-zinc-200/70 bg-white p-6 sm:p-8">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="break-words text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 break-words text-2xl font-semibold tracking-[-0.025em] text-zinc-950 sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-zinc-500">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="grid min-w-0 gap-3 sm:flex sm:flex-wrap xl:max-w-xl xl:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
