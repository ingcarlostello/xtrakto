import { describe, expect, it } from "vitest";
import { DOWNLOAD_COPY } from "./onboarding.constants";
import { downloadContentOf } from "./onboarding.helpers";

describe("downloadContentOf", () => {
  it.each([
    ["quarterly", ["quarterly", "movements"]],
    ["movements", ["movements", "quarterly"]],
    // A card's statement first, beside its savings account's (12.3b).
    ["card", ["card", "quarterly", "movements"]],
  ] as const)("puts Bancolombia's %s guide first", (first, guides) => {
    expect(downloadContentOf(first, "bancolombia")).toEqual({
      title: "Trae tus archivos de Bancolombia",
      subtitle: DOWNLOAD_COPY.subtitle[first],
      guides,
    });
  });

  it("guides Nu's card's statement", () => {
    expect(downloadContentOf("card", "nu")).toEqual({
      title: "Trae tu extracto de Nu",
      subtitle: DOWNLOAD_COPY.nu.subtitle,
      guides: ["nuCard"],
    });
  });

  // Nu's savings account, as another bank's, reads through its columns.
  it.each([
    ["quarterly", "other"],
    ["movements", "other"],
    ["quarterly", "nu"],
    ["movements", "nu"],
  ] as const)(
    "guides another bank's savings account for %s of %s",
    (first, bank) => {
      expect(downloadContentOf(first, bank)).toEqual({
        title: "Trae tus archivos de tu banco",
        subtitle: DOWNLOAD_COPY.otherBank.subtitle,
        guides: ["otherBank"],
      });
    },
  );

  it("says another bank's card isn't read yet, and guides its savings account", () => {
    expect(downloadContentOf("card", "other")).toEqual({
      title: "Trae tus archivos de tu banco",
      subtitle: DOWNLOAD_COPY.otherCardSubtitle,
      guides: ["otherBank"],
    });
  });
});
