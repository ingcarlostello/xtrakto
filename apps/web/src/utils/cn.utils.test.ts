import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cn, TEXT_SIZE_TOKENS } from "./cn.utils";

const GLOBALS_CSS = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

describe("cn", () => {
  it("knows every text size globals.css defines", () => {
    const sizes = [...GLOBALS_CSS.matchAll(/--text-([a-z0-9-]+):/g)]
      .map(([, name]) => name)
      .filter((name) => name !== undefined && !name.includes("--"));

    expect([...TEXT_SIZE_TOKENS].sort()).toEqual([...new Set(sizes)].sort());
  });

  it("keeps a text size and a text color together", () => {
    expect(cn("text-meta font-semibold", "text-ink-muted")).toBe(
      "text-meta font-semibold text-ink-muted",
    );
    expect(cn("text-body text-primary-strong", "text-caption")).toBe(
      "text-primary-strong text-caption",
    );
  });

  it("still lets a later size or color replace an earlier one", () => {
    expect(cn("text-meta text-ink", "text-caption text-danger")).toBe(
      "text-caption text-danger",
    );
  });
});
