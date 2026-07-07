import { BrandIcon } from "@/components/BrandIcon";

type SocialIconLinksProps = {
  emailLink: string;
  facebookLink: string;
  instagramLink: string;
  tone?: "dark" | "light";
  className?: string;
};

export function SocialIconLinks({
  emailLink,
  facebookLink,
  instagramLink,
  tone = "dark",
  className = ""
}: SocialIconLinksProps) {
  const colorClass =
    tone === "light"
      ? "border-white/20 bg-white/10 text-white hover:bg-white hover:text-brand-charcoal"
      : "border-brand-softGray bg-white text-brand-charcoal hover:border-brand-charcoal hover:bg-brand-charcoal hover:text-white";
  const baseClass = `group grid h-11 w-11 place-items-center rounded-full border transition ${colorClass}`;
  const iconTone = tone === "light" ? "light" : "dark";
  const iconClass =
    tone === "light"
      ? "h-5 w-5 group-hover:brightness-0 group-hover:invert-0"
      : "h-5 w-5 group-hover:brightness-0 group-hover:invert";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <a href={emailLink} aria-label="Email DE BRODER" className={baseClass}>
        <BrandIcon name="email" tone={iconTone} className={iconClass} />
      </a>
      <a
        href={facebookLink}
        aria-label="Facebook DE BRODER"
        className={baseClass}
        target="_blank"
        rel="noopener noreferrer"
      >
        <BrandIcon name="facebook" tone={iconTone} className={iconClass} />
      </a>
      <a
        href={instagramLink}
        aria-label="Instagram DE BRODER"
        className={baseClass}
        target="_blank"
        rel="noopener noreferrer"
      >
        <BrandIcon name="instagram" tone={iconTone} className={iconClass} />
      </a>
    </div>
  );
}
