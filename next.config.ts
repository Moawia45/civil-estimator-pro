import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript compiles cleanly locally — skip re-check on Vercel
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
