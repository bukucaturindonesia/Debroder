import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync("app/globals.css", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const hero = readFileSync("components/HeroSlider.tsx", "utf8");
const campaign = readFileSync("components/CampaignBanners.tsx", "utf8");
const footer = readFileSync("components/PublicFooter.tsx", "utf8");
const motionVideo = readFileSync("components/AccessibleAutoplayVideo.tsx", "utf8");

describe("DEBRODER Homepage premium visual V1 contract", () => {
  it("uses one consolidated homepage-scoped visual layer", () => {
    expect(globals.match(/DEBRODER HOMEPAGE PREMIUM EDITORIAL V1/g)).toHaveLength(1);
    expect(globals).not.toContain("DEBRODER_LANDING_VISUAL_BATCH_2");
    expect(globals).not.toContain("DEBRODER_LANDING_VISUAL_BATCH_3_FINAL_FROZEN");
    expect(globals).not.toContain("DEBRODER_LANDING_BATCH_1_3_PRECISION_FINAL");

    for (const token of [
      "--landing-canvas: #ffffff;",
      "--landing-ink: #111111;",
      "--landing-muted: #757575;",
      "--landing-rule: #e5e5e5;",
      "--landing-accent: #063d24;"
    ]) {
      expect(globals).toContain(token);
    }
  });

  it("keeps editorial cards as one semantic link", () => {
    const card = home.slice(home.indexOf("function EditorialCard"), home.indexOf("function CategoryEditorialCard"));
    expect(card.match(/<Link href=\{item\.href\}/g)).toHaveLength(1);
    expect(card).toContain('<span className="editorial-card-cta');
    expect(card).not.toContain('className="absolute inset-0 z-10"');
  });

  it("keeps hero media bounded, restrained, and limited to one priority image", () => {
    expect(hero).toContain("max-h-[760px]");
    expect(hero).toContain("priority={index === 0}");
    expect(hero.match(/priority=\{/g)).toHaveLength(1);
    expect(hero).toContain("videoRefs.current.forEach");
    expect(hero).toContain("paused || reducedMotion");
    expect(hero).not.toContain("backdrop-blur-md");
  });

  it("uses CMS alt and focal metadata while preserving internal Next links", () => {
    expect(campaign).toContain("banner.image_alt || banner.title || banner.name");
    expect(campaign).toContain("desktopObjectPosition={banner.object_position}");
    expect(campaign).toContain("mobileZoom={banner.mobile_focal_zoom}");
    expect(campaign).toContain("return <Link href={href}");
  });

  it("provides reduced-motion-aware, viewport-aware video controls", () => {
    expect(motionVideo).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(motionVideo).toContain("IntersectionObserver");
    expect(motionVideo).toContain('preload="metadata"');
    expect(motionVideo).toContain("video.pause()");
    expect(motionVideo).not.toContain("autoPlay");
    expect(home).toContain("<AccessibleAutoplayVideo");
    expect(campaign).toContain("<AccessibleAutoplayVideo");
  });

  it("keeps PublicFooter canonical with an explicit light homepage tone", () => {
    expect(footer).toContain('type FooterTone = "dark" | "light"');
    expect(footer).toContain('tone = "dark"');
    expect(footer).toContain("data-footer-tone={tone}");
    expect(home).toContain('<PublicFooter model={shellModel.data.footer} tone="light" />');
    expect(home.match(/<PublicFooter/g)).toHaveLength(1);
  });
});
