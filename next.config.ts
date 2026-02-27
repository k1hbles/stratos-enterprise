import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "canvas",
    "puppeteer",
    "@sparticuz/chromium-min",
    "chartjs-node-canvas",
  ],
};

export default nextConfig;
