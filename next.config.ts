import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // linkedom / readability are server-only; keep them out of the bundle graph.
  serverExternalPackages: ["linkedom", "@mozilla/readability"],
};

export default config;
