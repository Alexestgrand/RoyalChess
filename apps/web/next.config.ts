import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@royalchess/shared"],
  poweredByHeader: false,
  async headers() {
    return [];
  },
};

export default nextConfig;
