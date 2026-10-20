import Link from "next/link";

const LINK_CLASS = "min-h-11 items-center justify-center rounded-full border border-black bg-white px-5 text-sm font-semibold text-black transition hover:bg-black hover:text-white";

export function PersistentTrackingButton({ href, mobilePlacement = "fixed" }: { href: string; mobilePlacement?: "fixed" | "inline" }) {
  return (
    <>
      <Link href={href} className={`hidden sm:inline-flex ${LINK_CLASS}`}>
        Lacak Pesanan
      </Link>
      <div className={mobilePlacement === "inline" ? "w-full sm:hidden" : "fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 p-3 backdrop-blur sm:hidden"}>
        <Link href={href} className={`inline-flex w-full ${LINK_CLASS}`}>
          Lacak Pesanan
        </Link>
      </div>
    </>
  );
}
