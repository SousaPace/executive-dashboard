import type { NextConfig } from "next";

const pollMs = Number(process.env.NEXT_WATCH_POLL_MS);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Opt-in polling for file systems without change events (repo on /mnt/c under WSL).
  ...(pollMs > 0 ? { watchOptions: { pollIntervalMs: pollMs } } : {}),
};

export default nextConfig;
