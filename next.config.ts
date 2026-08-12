import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/brand/debroder/open-graph-logo.png", destination: "/debroder/open-graph-logo.png" },
      { source: "/brand/debroder/social-preview.png", destination: "/debroder/social-preview.png" }
    ];
  },
  async headers() {
    return [
      {
        source: "/debroder/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800"
          }
        ]
      },
      {
        source: "/products/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800"
          }
        ]
      },
      {
        source: "/product-images-source/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800"
          }
        ]
      }
    ];
  },
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
    workerThreads: false
  },
  images: {
    // WebP is the canonical transformed delivery format for raster imagery.
    // Logos stay outside next/image (see Logo.tsx and BrandIcon.tsx).
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co"
      }
    ]
  },
  poweredByHeader: false,
  reactStrictMode: true
};

export default nextConfig;
