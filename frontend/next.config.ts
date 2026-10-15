import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Stop `next dev` from writing AGENTS.md.
  agentRules: false,
};

export default nextConfig;
