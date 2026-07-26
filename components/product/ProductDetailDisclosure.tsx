"use client";

import { useState, type ReactNode } from "react";
import { BrandIcon } from "@/components/BrandIcon";

export function ProductDetailDisclosure({
  id,
  title,
  children
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  return (
    <section className="border-t border-[#e5e5e5]">
      <h2>
        <button
          id={triggerId}
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((current) => !current)}
          className="flex min-h-14 w-full items-center justify-between gap-4 text-left text-[15px] font-semibold text-[#111111] outline-none focus-visible:ring-2 focus-visible:ring-[#1151ff] focus-visible:ring-offset-2"
        >
          <span>{title}</span>
          <BrandIcon
            name="chevronDown"
            className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </h2>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!expanded}
        className="pb-6 text-[15px] leading-7 text-[#707072]"
      >
        {children}
      </div>
    </section>
  );
}
