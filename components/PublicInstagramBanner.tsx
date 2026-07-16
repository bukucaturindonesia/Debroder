import { ResponsivePicture } from "@/components/ResponsivePicture";
import type { InstagramBanner } from "@/lib/types";

export function PublicInstagramBanner({ banner }: { banner: InstagramBanner }) {
  if (!banner.id || banner.status_aktif === false || !banner.image_url || !banner.link_url) {
    return null;
  }

  const label = banner.cta_label || banner.title || "Instagram DEBRODER";
  const isExternal = banner.link_url.startsWith("http");
  const media = banner.media_type === "video" && banner.video_url ? (
    <>
      <video
        src={banner.video_url}
        className="absolute inset-0 hidden h-full w-full object-cover sm:block"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <video
        src={banner.mobile_video_url || banner.video_url}
        className="absolute inset-0 h-full w-full object-cover sm:hidden"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
    </>
  ) : (
    <ResponsivePicture
      desktopSrc={banner.image_url}
      mobileSrc={banner.mobile_image_url || banner.image_url}
      fallbackSrc={banner.image_url}
      alt={banner.image_alt || banner.title || "Banner Instagram DEBRODER"}
      className="h-full w-full object-cover"
      objectFit={banner.object_fit || "cover"}
      desktopObjectPosition={banner.object_position}
      mobileObjectPosition={banner.mobile_object_position || banner.object_position}
      desktopZoom={banner.focal_zoom}
      mobileZoom={banner.mobile_focal_zoom}
    />
  );

  return (
    <a
      href={banner.link_url}
      aria-label={label}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="group relative block aspect-[4/5] overflow-hidden bg-[#efefef] sm:aspect-[12/5]"
    >
      {media}
    </a>
  );
}
