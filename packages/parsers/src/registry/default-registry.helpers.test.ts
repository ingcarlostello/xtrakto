import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE, err } from "@xtrakto/core";
import { fixtureContent } from "../../fixtures/fixture.utils";
import movementsBasic from "../../fixtures/movements-basic.json";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import quarterlyLarge from "../../fixtures/quarterly-large.json";
import { findParser } from "./default-registry.helpers";

describe("findParser", () => {
  it.each([
    { name: "quarterly-basic", fixture: quarterlyBasic },
    { name: "quarterly-large", fixture: quarterlyLarge },
  ])("finds the quarterly statement parser for $name", ({ fixture }) => {
    const result = findParser(fixtureContent(fixture));

    expect(result.ok && result.value.id).toBe("bancolombia-savings-quarterly");
  });

  it("returns UNKNOWN_FORMAT for a format no parser reads yet", () => {
    expect(findParser(fixtureContent(movementsBasic))).toEqual(
      err({ code: APP_ERROR_CODE.UNKNOWN_FORMAT }),
    );
  });
});
