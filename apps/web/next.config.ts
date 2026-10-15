import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// Next.js reads `.env*` files only from apps/web, but the repository keeps one
// `.env.local` at its root, as drizzle-kit, Vitest and the seed do. Variables
// already set win, and Vercel has no file. Next runs this file as CommonJS, so
// `__dirname` rather than `import.meta.url`. Nothing is validated here:
// `next typegen` evaluates this file in CI, where no variable is set.
const rootEnvFile = join(__dirname, "../../.env.local");
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const nextConfig: NextConfig = {
  // A link to a route that doesn't exist fails `check-types`.
  typedRoutes: true,
  // In development, Next.js logs every server action with its arguments: a
  // statement's content, or a name and an email from the waitlist. Logs
  // never carry personal or financial data (system design §4).
  logging: { serverFunctions: false },
  experimental: {
    serverActions: {
      // A statement's content goes up to 3.5 MB (MAX_UPLOAD_CONTENT_BYTES)
      // and Vercel Functions accept request bodies of 4.5 MB; the default is 1 MB.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
