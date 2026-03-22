import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options",        value: "DENY" },
        { key: "X-Content-Type-Options",  value: "nosniff" },
        { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
    // Never cache the HTML shell — ensures browsers and Cloudflare always fetch
    // the latest app after a deploy. JS/CSS are content-hashed by Next.js so
    // their long-lived cache is safe regardless.
    {
      source: "/",
      headers: [
        { key: "Cache-Control", value: "no-store" },
      ],
    },
  ],
};

export default nextConfig;
