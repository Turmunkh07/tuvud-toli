import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      // Server Actions default to a 1MB body; xlsx uploads need more.
      // Kept under Vercel's 4.5MB serverless request limit.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
