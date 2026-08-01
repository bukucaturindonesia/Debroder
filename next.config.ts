import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/brand/debroder/open-graph-logo.png", destination: "/debroder/open-graph-logo.png" },
      { source: "/brand/debroder/social-preview.png", destination: "/debroder/social-preview.png" }
    ];
  },
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
    workerThreads: false
  },
  images: {
    formats: ["image/avif", "image/webp"],
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
