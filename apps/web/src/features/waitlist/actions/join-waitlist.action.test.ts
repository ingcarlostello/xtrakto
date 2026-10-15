import { beforeEach, describe, expect, it, vi } from "vitest";
import { joinWaitlist } from "./join-waitlist.action";

const mocks = vi.hoisted(() => ({ addToWaitlist: vi.fn() }));

vi.mock("../waitlist.service", () => ({ addToWaitlist: mocks.addToWaitlist }));

const VALID = { name: "Ana Prueba", email: "ana@example.com", consent: true };

// The browser can send anything to a public action.
const joinUntyped = (input: unknown) =>
  joinWaitlist(input as Parameters<typeof joinWaitlist>[0]);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("joinWaitlist", () => {
  it("adds the person, needing no session, with the name trimmed and the email lowercased", async () => {
    await expect(
      joinWaitlist({
        name: "  Ana María ",
        email: " Ana@Example.COM ",
        consent: true,
      }),
    ).resolves.toEqual({ ok: true, value: null });
    expect(mocks.addToWaitlist).toHaveBeenCalledWith({
      name: "Ana María",
      email: "ana@example.com",
      consent: true,
    });
  });

  it("answers the same when the email is already on the list", async () => {
    const first = await joinWaitlist(VALID);
    const again = await joinWaitlist({ ...VALID, name: "Otra Persona" });

    expect(again).toEqual(first);
  });

  it.each([
    ["an unchecked consent", { ...VALID, consent: false }],
    ["a missing consent", { name: VALID.name, email: VALID.email }],
    ["a consent sent as text", { ...VALID, consent: "on" }],
    ["an email without a domain", { ...VALID, email: "ana@" }],
    [
      "an email over 254 characters",
      { ...VALID, email: `${"a".repeat(250)}@example.com` },
    ],
    ["an empty name", { ...VALID, name: "" }],
    ["a name of spaces", { ...VALID, name: "   " }],
    ["a name over 100 characters", { ...VALID, name: "a".repeat(101) }],
    ["a consent version from the browser", { ...VALID, consentVersion: "v0" }],
    [
      "a consent time from the browser",
      { ...VALID, consentAcceptedAt: "2020-01-01" },
    ],
    ["no object", "ana@example.com"],
  ])("refuses %s and adds no one", async (_, input) => {
    await expect(joinUntyped(input)).resolves.toEqual({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mocks.addToWaitlist).not.toHaveBeenCalled();
  });

  it("lets an unexpected failure reject, for the form to ask for a reload", async () => {
    mocks.addToWaitlist.mockRejectedValue(new Error("WAITLIST_NOT_JOINED"));

    await expect(joinWaitlist(VALID)).rejects.toThrow("WAITLIST_NOT_JOINED");
  });
});
