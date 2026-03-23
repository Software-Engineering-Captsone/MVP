import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /** Hide the Next.js dev indicator (bottom-left on localhost). Errors still use the overlay. */
  devIndicators: false,
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
