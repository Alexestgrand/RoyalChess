import type { NextConfig } from "next";

function buildAvatarRemotePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  try {
    const u = new URL(raw);
    const protocol = u.protocol === "https:" ? "https" : "http";
    const entry: {
      protocol: "http" | "https";
      hostname: string;
      pathname: string;
      port?: string;
    } = {
      protocol,
      hostname: u.hostname,
      pathname: "/uploads/avatars/**",
    };
    if (u.port) {
      entry.port = u.port;
    }
    return [entry];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@royalchess/shared"],
  poweredByHeader: false,
  images: {
    remotePatterns: buildAvatarRemotePatterns(),
  },
  async headers() {
    return [];
  },
};

export default nextConfig;
