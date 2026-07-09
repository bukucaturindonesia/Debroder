/* eslint-disable @next/next/no-img-element */

type LogoVariant =
  | "primary-dark"
  | "primary-white"
  | "symbol-dark"
  | "symbol-white"
  | "symbol-black"
  | "primary-black"
  | "primary-dark-bg";

type LogoSize = "sm" | "md" | "lg";

const sizeClasses: Record<LogoSize, { symbol: string; wordmark: string; gap: string }> = {
  sm: { symbol: "h-8 w-8", wordmark: "h-5 w-[104px]", gap: "gap-2" },
  md: { symbol: "h-10 w-10", wordmark: "h-6 w-[126px]", gap: "gap-2.5" },
  lg: { symbol: "h-12 w-12", wordmark: "h-7 w-[148px]", gap: "gap-3" }
};

export function Logo({
  variant,
  size = "md",
  className = ""
}: {
  variant: LogoVariant;
  size?: LogoSize;
  className?: string;
  showText?: boolean;
  textTone?: "white" | "black";
}) {
  const dimensions = sizeClasses[size];
  const white = variant === "primary-white" || variant === "symbol-white" || variant === "primary-dark-bg";
  const symbolOnly = variant.startsWith("symbol-");
  const symbolSrc = white
    ? "/brand/debroder/logo-symbol-white.svg"
    : "/brand/debroder/logo-symbol-black.svg";
  const wordmarkSrc = white
    ? "/brand/debroder/logo-wordmark-white.svg"
    : "/brand/debroder/logo-wordmark-black.svg";

  if (symbolOnly) {
    return <img src={symbolSrc} alt="Logo DE BRODER" className={`${dimensions.symbol} shrink-0 object-contain ${className}`} decoding="async" />;
  }

  return (
    <span role="img" aria-label="Logo DE BRODER" className={`inline-flex shrink-0 items-center ${dimensions.gap} ${className}`}>
      <img src={symbolSrc} alt="" aria-hidden="true" className={`${dimensions.symbol} shrink-0 object-contain`} decoding="async" />
      <img src={wordmarkSrc} alt="" aria-hidden="true" className={`${dimensions.wordmark} object-contain object-left`} decoding="async" />
    </span>
  );
}
