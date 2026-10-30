import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordAiCall } from "./langfuse";

// Langfuse is replaced by a fake fetch, and Sentry by a spy: what leaves is
// read from the request the module builds.
const mocks = vi.hoisted(() => ({
  env: {} as Record<string, string | undefined>,
  captureException: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("./env", () => ({ getServerEnv: () => mocks.env }));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }));

const PUBLIC_KEY = ["pk", "lf", "publicKey0123456789"].join("-");
const SECRET_KEY = ["sk", "lf", "secretKey0123456789"].join("-");
const CALL = {
  prompt: { name: "check", version: 1 },
  attempts: [
    {
      model: "deepseek-flash" as const,
      outcome: "OK" as const,
      startedAt: 1_700_000_000_000,
      endedAt: 1_700_000_001_000,
      usage: { inputTokens: 40, outputTokens: 12, costMicroUsd: 27 },
    },
  ],
};

const sent = () => {
  const [url, init] = mocks.fetch.mock.calls[0] ?? [];
  return { url, init, body: JSON.parse(init?.body ?? "null") };
};

const spansOf = (body: {
  resourceSpans: { scopeSpans: { spans: Record<string, unknown>[] }[] }[];
}) => body.resourceSpans[0]?.scopeSpans[0]?.spans ?? [];

beforeEach(() => {
  mocks.env = {
    LANGFUSE_PUBLIC_KEY: PUBLIC_KEY,
    LANGFUSE_SECRET_KEY: SECRET_KEY,
  };
  mocks.captureException.mockReset();
  mocks.fetch.mockReset();
  mocks.fetch.mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", mocks.fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recordAiCall", () => {
  it("sends nothing without Langfuse's keys, as in CI", async () => {
    mocks.env = {};

    await recordAiCall(CALL);

    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("sends the call to Langfuse's US region, with its keys and its current ingestion", async () => {
    await recordAiCall(CALL);

    const { url, init } = sent();
    expect(url).toBe("https://us.cloud.langfuse.com/api/public/otel/v1/traces");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: `Basic ${Buffer.from(`${PUBLIC_KEY}:${SECRET_KEY}`).toString("base64")}`,
      "Content-Type": "application/json",
      "x-langfuse-ingestion-version": "4",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("gives the trace fresh ids, and tags it development outside Vercel's production", async () => {
    await recordAiCall(CALL);

    const spans = spansOf(sent().body);
    const [call, generation] = spans;
    expect(call?.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(call?.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(generation?.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(generation?.spanId).not.toBe(call?.spanId);
    expect(JSON.stringify(call)).toContain('"stringValue":"development"');
  });

  it("tags it production on Vercel's production", async () => {
    mocks.env = { ...mocks.env, VERCEL_ENV: "production" };

    await recordAiCall(CALL);

    expect(JSON.stringify(spansOf(sent().body)[0])).toContain(
      '"stringValue":"production"',
    );
  });

  it("tells Sentry, without the keys, when Langfuse refuses a trace", async () => {
    mocks.fetch.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(recordAiCall(CALL)).resolves.toBeUndefined();

    const [error] = mocks.captureException.mock.calls[0] ?? [];
    expect(error).toEqual(new Error("Langfuse refused a trace: 401"));
  });

  it("never fails the call when Langfuse is out of reach, and says only what failed", async () => {
    mocks.fetch.mockRejectedValue(new TypeError(`fetch failed ${SECRET_KEY}`));

    await expect(recordAiCall(CALL)).resolves.toBeUndefined();

    const [error] = mocks.captureException.mock.calls[0] ?? [];
    expect(error).toEqual(new Error("Langfuse export failed: TypeError"));
  });
});
