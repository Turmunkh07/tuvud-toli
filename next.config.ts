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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops /admin (or any page) from being framed by another site —
          // the standard clickjacking defense, cheap and has no functional cost.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser from guessing a file's type from its content,
          // which is how a misconfigured upload can end up executed as script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
