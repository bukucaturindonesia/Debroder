"use client";

import { useEffect, useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";

export function WhatsAppFloat({ href }: { href: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > Math.min(640, window.innerHeight * 0.72));
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat WhatsApp DEBRODER"
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[70] inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#063d24] px-4 text-sm font-semibold text-white transition duration-300 hover:bg-[#0f5a36] sm:bottom-6 sm:right-6 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <BrandIcon name="whatsapp" tone="light" />
      <span className="hidden sm:inline">Chat WhatsApp</span>
    </a>
  );
}
