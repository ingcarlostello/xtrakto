import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE, err } from "@xtrakto/core";
import type { ExtractedContent } from "@xtrakto/core";
import { fixtureContent } from "../../fixtures/fixture.utils";
import movementsBasic from "../../fixtures/movements-basic.json";
import movementsOverlap from "../../fixtures/movements-overlap.json";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import quarterlyLarge from "../../fixtures/quarterly-large.json";
import { findParser } from "./default-registry.helpers";

describe("findParser", () => {
  it.each([
    {
      name: "quarterly-basic",
      fixture: quarterlyBasic,
      id: "bancolombia-savings-quarterly",
    },
    {
      name: "quarterly-large",
      fixture: quarterlyLarge,
      id: "bancolombia-savings-quarterly",
    },
    {
      name: "movements-basic",
      fixture: movementsBasic,
      id: "bancolombia-movements-export",
    },
    {
      name: "movements-overlap",
      fixture: movementsOverlap,
      id: "bancolombia-movements-export",
    },
  ])("finds the $id parser for $name", ({ fixture, id }) => {
    const result = findParser(fixtureContent(fixture));

    expect(result.ok && result.value.id).toBe(id);
  });

  it.each<{ label: string; content: ExtractedContent }>([
    {
      label: "another spreadsheet",
      content: {
        type: "spreadsheet",
        sheets: [{ name: "Gastos", rows: [["Fecha", "Concepto", "Monto"]] }],
      },
    },
    { label: "a PDF", content: { type: "pdf", pages: [{ items: [] }] } },
  ])("returns UNKNOWN_FORMAT for $label", ({ content }) => {
    expect(findParser(content)).toEqual(
      err({ code: APP_ERROR_CODE.UNKNOWN_FORMAT }),
    );
  });
});
