import type { NextConfig } from "next";
import { execSync } from "child_process";

// Baked in at build time so a small version tag can be shown in the UI —
// the only reliable way to tell "what I just shipped" from "what's actually
// live" apart. Prefer Vercel's own commit SHA (matches the deployed build
// exactly); fall back to reading git directly for local dev/other hosts.
function resolveAppVersion(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
  },
};

export default nextConfig;
