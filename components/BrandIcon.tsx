import { brandIcons, type BrandIconName } from "@/lib/icons";

type BrandIconProps = {
  name: BrandIconName;
  alt?: string;
  className?: string;
  tone?: "dark" | "light";
};

export function BrandIcon({ name, alt = "", className = "h-5 w-5", tone = "dark" }: BrandIconProps) {
  return (
    <img
      src={brandIcons[name]}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={`${className} ${tone === "light" ? "brightness-0 invert" : ""}`}
      loading="lazy"
    />
  );
}
