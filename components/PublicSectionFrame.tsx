import type { ReactNode } from "react";

type PublicSectionFrameVariant = "wide" | "near-wide" | "inset";

export function PublicSectionFrame({
  children,
  className = "",
  variant = "near-wide"
}: {
  children: ReactNode;
  className?: string;
  variant?: PublicSectionFrameVariant;
}) {
  return (
    <div className={`public-section-frame public-section-frame--${variant} ${className}`.trim()}>
      {children}
    </div>
  );
}
