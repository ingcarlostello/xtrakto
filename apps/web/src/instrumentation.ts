// Runs once when a server instance starts. If an environment variable is
// missing or invalid, the throw stops `next dev` and `next start` instead of
// failing the first request. Next replaces NEXT_RUNTIME at compile time, which
// keeps lib/env.ts out of the Edge bundle; that's why it's read here directly.
export async function register(): Promise<void> {
  // Set by Next.js per bundle, not by the deployment, so turbo.json doesn't list it.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnv } = await import("./lib/env");
    getServerEnv();
  }
}
