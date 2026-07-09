"use client";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={direction === "left" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ScrollButtons({ containerId }: { containerId: string }) {
  function scrollByCard(direction: "prev" | "next") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const amount = Math.max(280, Math.round(container.clientWidth * 0.82));
    container.scrollBy({ left: direction === "next" ? amount : -amount, behavior: "smooth" });
  }

  const buttonClass = "grid h-10 w-10 place-items-center rounded-full bg-[#f2f2ef] text-[#111] transition duration-200 hover:bg-[#111] hover:text-white";

  return (
    <div className="flex items-center gap-2" aria-label="Kontrol carousel">
      <button type="button" className={buttonClass} aria-label="Geser sebelumnya" onClick={() => scrollByCard("prev")}>
        <Chevron direction="left" />
      </button>
      <button type="button" className={buttonClass} aria-label="Geser berikutnya" onClick={() => scrollByCard("next")}>
        <Chevron direction="right" />
      </button>
    </div>
  );
}
