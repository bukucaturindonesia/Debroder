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
    <header className="min-w-0 border border-brand-softGray bg-white p-5 sm:p-7">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="break-words text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 break-words text-3xl font-semibold sm:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-brand-charcoal/65">
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
