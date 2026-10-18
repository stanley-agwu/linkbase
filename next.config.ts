import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker runtime image needs the self-contained server; Vercel builds
  // through its own adapter and leaves this unset (deployment.md §2).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
