import Link from "next/link";
import { ResponsivePicture } from "@/components/ResponsivePicture";

export function CommercePageIntro({
  breadcrumbLabel,
  title,
  description,
  label,
  imageUrl,
  mobileImageUrl,
  objectPosition,
  mobileObjectPosition,
  objectFit,
  imageZoom,
  mobileImageZoom
}: {
  breadcrumbLabel: string;
  title?: string;
  description?: string;
  label?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  objectPosition?: string;
  mobileObjectPosition?: string;
  objectFit?: "cover" | "contain";
  imageZoom?: number | null;
  mobileImageZoom?: number | null;
}) {
  return (
    <header className="border-b border-black/10 bg-white">
      <div className="section-shell grid items-center gap-5 py-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] md:gap-10 md:py-7">
        <div>
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-black/50"><Link href="/" className="hover:underline">Beranda</Link><span aria-hidden="true"> / </span>{breadcrumbLabel}</nav>
          {label ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">{label}</p> : null}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title || breadcrumbLabel}</h1>
          {description ? <p className="mt-3 max-w-xl text-sm leading-6 text-black/65 sm:text-base">{description}</p> : null}
        </div>
        {imageUrl ? <div className="relative aspect-[16/7] overflow-hidden bg-[#f3f3f1] md:aspect-[16/6]"><ResponsivePicture desktopSrc={imageUrl} mobileSrc={mobileImageUrl || imageUrl} alt={title || breadcrumbLabel} className="h-full w-full" desktopObjectPosition={objectPosition} mobileObjectPosition={mobileObjectPosition || objectPosition} objectFit={objectFit || "cover"} desktopZoom={imageZoom} mobileZoom={mobileImageZoom} /></div> : null}
      </div>
    </header>
  );
}
