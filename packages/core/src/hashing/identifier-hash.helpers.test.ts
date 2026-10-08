import { describe, expect, it } from "vitest";
import { MIN_IDENTIFIER_HASH_KEY_LENGTH } from "./identifier-hash.constants";
import { hashIdentifier } from "./identifier-hash.helpers";

// Invented keys. The expected hashes come from node:crypto's createHmac, an
// implementation independent from the Web Crypto code under test.
const KEY_A = "test-key-a-0123456789abcdef0123456789";
const KEY_B = "test-key-b-0123456789abcdef0123456789";

const PHONE_HASH_A =
  "c0ba9aba7214a90c13f5f97d1969325a5fbcc58f31b69df7ae1966adcff144cb";
const ATM_HASH_A =
  "6c7e55ab9acf34d2639493549ad0a6a332f6707fb032fe6fb0641b8446a3e676";
const ACCENT_HASH_A =
  "943d76fdf812f351dee8767890ce6888b9a53bb90c33a6a2f6d01ed41f5d8229";

describe("hashIdentifier", () => {
  it.each([
    { key: KEY_A, value: "3001234567", hash: PHONE_HASH_A },
    { key: KEY_A, value: "CAJERO CENTRO 2", hash: ATM_HASH_A },
    { key: KEY_A, value: "CAJERO BOGOTÁ", hash: ACCENT_HASH_A },
    {
      key: KEY_B,
      value: "3001234567",
      hash: "c84ce0a54fb508cf5ba766a748ac4870f974ac0bc4aced18b28ec8f3600d5daa",
    },
    {
      key: KEY_B,
      value: "CAJERO CENTRO 2",
      hash: "8526534472e6ad446ada76ce9afd310d5bf3bc76aeb78f88a5c655d3ca640f32",
    },
  ])(
    "matches the reference HMAC-SHA-256 of $value",
    async ({ key, value, hash }) => {
      await expect(hashIdentifier(value, key)).resolves.toBe(hash);
    },
  );

  it("gives the same value different hashes under different keys", async () => {
    const [hashA, hashB] = await Promise.all([
      hashIdentifier("3001234567", KEY_A),
      hashIdentifier("3001234567", KEY_B),
    ]);

    expect(hashA).not.toBe(hashB);
  });

  it.each([
    "+57 300 123 4567",
    "300 123 4567",
    "(300) 123-4567",
    "300.123.4567",
    "573001234567",
    " 3001234567 ",
  ])("hashes the mobile number %j like its 10 digits", async (value) => {
    await expect(hashIdentifier(value, KEY_A)).resolves.toBe(PHONE_HASH_A);
  });

  it("ignores case and extra spaces in other identifiers", async () => {
    await expect(hashIdentifier("  cajero   centro 2 ", KEY_A)).resolves.toBe(
      ATM_HASH_A,
    );
  });

  it("treats a decomposed accent like the composed one", async () => {
    await expect(hashIdentifier("CAJERO BOGOTA\u0301", KEY_A)).resolves.toBe(
      ACCENT_HASH_A,
    );
  });

  it("keeps separators in numbers that aren't Colombian mobiles", async () => {
    const [spaced, compact] = await Promise.all([
      hashIdentifier("200 123 4567", KEY_A),
      hashIdentifier("2001234567", KEY_A),
    ]);

    expect(spaced).not.toBe(compact);
  });

  it("rejects an empty identifier", async () => {
    await expect(hashIdentifier("   ", KEY_A)).rejects.toThrow(RangeError);
  });

  it(`rejects a key shorter than ${MIN_IDENTIFIER_HASH_KEY_LENGTH} characters`, async () => {
    const shortKey = "k".repeat(MIN_IDENTIFIER_HASH_KEY_LENGTH - 1);

    await expect(hashIdentifier("3001234567", shortKey)).rejects.toThrow(
      RangeError,
    );
  });
});
