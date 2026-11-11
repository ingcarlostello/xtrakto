import { describe, expect, it } from "vitest";
import { formatFingerprint } from "./format-mapping.helpers";

const HEADER = ["FECHA TRANS", "DETALLE", "DEBITOS", "CREDITOS", "SALDO"];

describe("formatFingerprint", () => {
  it("gives a header 64 hex characters, the same each time", async () => {
    const fingerprint = await formatFingerprint(HEADER);

    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(await formatFingerprint([...HEADER])).toBe(fingerprint);
  });

  it.each([
    { change: "another name", header: HEADER.with(1, "DESCRIPCION") },
    { change: "another order", header: HEADER.toReversed() },
    { change: "one name less", header: HEADER.slice(1) },
    {
      change: "two names as one, with the same letters",
      header: ["FECHA TRANSDETALLE", ...HEADER.slice(2)],
    },
    { change: "an empty name more", header: [...HEADER, ""] },
  ])("tells apart a header with $change", async ({ header }) => {
    expect(await formatFingerprint(header)).not.toBe(
      await formatFingerprint(HEADER),
    );
  });
});
