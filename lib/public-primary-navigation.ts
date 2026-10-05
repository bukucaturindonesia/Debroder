import { PUBLIC_ROUTES } from "@/lib/public-routes";

/** Owner-approved order shared by desktop, mobile drawer and footer. */
export const publicPrimaryNavigation = [
  { label: "Koleksi", href: PUBLIC_ROUTES.collection },
  { label: "Kaos Polos", href: PUBLIC_ROUTES.plainShirts },
  { label: "Sablon DTF", href: PUBLIC_ROUTES.dtf },
  { label: "Jersey", href: PUBLIC_ROUTES.jersey },
  { label: "Custom", href: PUBLIC_ROUTES.custom },
  { label: "Jaket & Hoodie", href: PUBLIC_ROUTES.jackets },
  { label: "Headwear", href: PUBLIC_ROUTES.headwear }
] as const;
