import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
