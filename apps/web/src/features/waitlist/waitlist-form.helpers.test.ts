import { describe, expect, it } from "vitest";
import { readWaitlistForm, waitlistFormErrors } from "./waitlist-form.helpers";
import { WAITLIST_COPY } from "./waitlist.constants";

const formWith = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
};

describe("readWaitlistForm", () => {
  // Base UI's checkbox submits "on" when checked, and nothing when not.
  it("reads a checked box as consent and a missing one as none", () => {
    const fields = { name: "Ana", email: "ana@example.com" };

    expect(readWaitlistForm(formWith({ ...fields, consent: "on" }))).toEqual({
      ...fields,
      consent: true,
    });
    expect(readWaitlistForm(formWith(fields)).consent).toBe(false);
  });
});

describe("waitlistFormErrors", () => {
  it("finds nothing in a valid form", () => {
    expect(
      waitlistFormErrors({
        name: " Ana ",
        email: " Ana@Example.com ",
        consent: true,
      }),
    ).toEqual({});
  });

  it("gives each wrong field its message, as the action's schema checks it", () => {
    expect(
      waitlistFormErrors({ name: " ", email: "ana", consent: false }),
    ).toEqual({
      name: WAITLIST_COPY.errors.name,
      email: WAITLIST_COPY.errors.email,
      consent: WAITLIST_COPY.form.consentFirst,
    });
  });
});
