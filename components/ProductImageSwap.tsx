import { SafeImage } from "@/components/SafeImage";

export function ProductImageSwap({
  primarySrc,
  hoverSrc,
  fallbackSrc,
  alt,
  className = "",
  imageClassName = "object-cover",
  sizes,
  objectFit = "cover",
  objectPosition,
  focalX,
  focalY,
  zoom
}: {
  primarySrc: string;
  hoverSrc?: string | null;
  fallbackSrc: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes: string;
  objectFit?: "cover" | "contain";
  objectPosition?: string;
  focalX?: number | null;
  focalY?: number | null;
  zoom?: number | null;
}) {
  return (
    <div className={`product-image-frame relative aspect-[4/5] w-full overflow-hidden ${className}`.trim()}>
      <SafeImage
        src={primarySrc}
        fallbackSrc={fallbackSrc}
        alt={alt}
        fill
        className={`${imageClassName} product-image-primary ${hoverSrc ? "has-secondary" : ""} transition-[opacity,transform] duration-300 ease-out`}
        objectFit={objectFit}
        objectPosition={objectPosition}
        focalX={focalX}
        focalY={focalY}
        zoom={zoom}
        sizes={sizes}
      />
      {hoverSrc ? (
        <SafeImage
          src={hoverSrc}
          fallbackSrc={primarySrc || fallbackSrc}
          alt={`${alt} tampak belakang`}
          fill
          className={`${imageClassName} product-image-secondary pointer-events-none opacity-0 transition-[opacity,transform] duration-300 ease-out`}
          objectFit={objectFit}
          objectPosition={objectPosition}
          sizes={sizes}
        />
      ) : null}
    </div>
  );
}
