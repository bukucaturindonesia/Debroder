import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DEBRODER",
    short_name: "DEBRODER",
    description: "Bahan tekstil dan produksi apparel untuk brand Anda",
    start_url: "/",
    display: "standalone",
    background_color: "#f9f8f5",
    theme_color: "#f9f8f5",
    icons: [
      {
        src: "/debroder/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/debroder/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
