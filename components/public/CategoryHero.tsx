import { ResponsivePicture } from "@/components/ResponsivePicture";
import { fallbackImages } from "@/lib/fallback-data";

type CategoryHeroProps = {
  desktopImage?: string;
  mobileImage?: string;
  alt: string;
  seoTitle?: string;
  objectPosition?: string;
  mobileObjectPosition?: string;
  objectFit?: "cover" | "contain";
  imageZoom?: number | null;
  mobileImageZoom?: number | null;
  kaosBenchmark?: boolean;
};

/** The approved Kaos hero geometry lives in the shared stylesheet. */
export function CategoryHero({
  desktopImage,
  mobileImage,
  alt,
  seoTitle,
  objectPosition,
  mobileObjectPosition,
  objectFit = "cover",
  imageZoom,
  mobileImageZoom,
  kaosBenchmark = false
}: CategoryHeroProps) {
  return (
    <section
      data-category-hero
      data-kaos-blueprint-section={kaosBenchmark ? "hero" : undefined}
      aria-label={alt}
      className="kaos-blueprint-hero relative overflow-hidden bg-[#f0f0ed]"
    >
      {seoTitle ? <h1 className="sr-only">{seoTitle}</h1> : null}
      <ResponsivePicture
        desktopSrc={desktopImage || fallbackImages.pageHero}
        mobileSrc={mobileImage || desktopImage || fallbackImages.pageHeroMobile}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        priority
        objectFit={objectFit}
        desktopObjectPosition={objectPosition}
        mobileObjectPosition={mobileObjectPosition}
        desktopZoom={imageZoom}
        mobileZoom={mobileImageZoom}
      />
    </section>
  );
}
