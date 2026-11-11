import { readFileSync } from "node:fs";
import {
  APP_ERROR_CODE,
  err,
  type ExtractedContent,
  extractedContentSchema,
  type FormatMapping,
  formatMappingSchema,
} from "@xtrakto/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findStatementParser } from "./format-mapping.service";

// The saved mappings' queries and their Row-Level Security are tested in
// @xtrakto/db; here, which mapping reads a file and what gets saved. The
// parsers run for real.
const mocks = vi.hoisted(() => ({
  findFormatMapping: vi.fn(),
  saveOwnFormatMapping: vi.fn(),
  shareFormatMapping: vi.fn(),
}));

vi.mock("@xtrakto/db", () => mocks);

const CONTEXT = { tx: "tx", userId: "0b6f1d2e-58c4-4c31-9a59-6a3f0f5c2e11" };
const FIXTURES = new URL(
  "../../../../../packages/parsers/fixtures/",
  import.meta.url,
);

const fixture = (name: string): ExtractedContent =>
  extractedContentSchema.parse(
    JSON.parse(readFileSync(new URL(`${name}.json`, FIXTURES), "utf8")),
  );

// v8-14's "Banco Horizonte", whose balances add up.
const OUT_AND_IN: FormatMapping = formatMappingSchema.parse({
  header: ["FECHA TRANS", "DETALLE", "OFICINA", "DEBITOS", "CREDITOS", "SALDO"],
  columns: ["date", "description", "none", "money_out", "money_in", "balance"],
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "other",
});

const NO_BALANCE: FormatMapping = formatMappingSchema.parse({
  header: ["FECHA", "DETALLE", "DEBITOS", "CREDITOS"],
  columns: ["date", "description", "money_out", "money_in"],
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "davivienda",
});

const HORIZONTE = fixture("mapped-out-in");
const WITHOUT_BALANCES = fixture("mapped-no-balance");

const parserOf = async (content: ExtractedContent, confirmed?: FormatMapping) =>
  findStatementParser(
    // Safe: the mocked queries never read the transaction.
    CONTEXT as unknown as Parameters<typeof findStatementParser>[0],
    content,
    confirmed,
  );

beforeEach(() => {
  vi.resetAllMocks();
  mocks.shareFormatMapping.mockResolvedValue(true);
});

describe("findStatementParser", () => {
  it("reads a known format with its parser, whatever mapping comes with it", async () => {
    const parser = await parserOf(fixture("movements-basic"), OUT_AND_IN);

    expect(parser).toMatchObject({
      ok: true,
      value: { id: "bancolombia-movements-export" },
    });
    expect(mocks.findFormatMapping).not.toHaveBeenCalled();
    expect(mocks.saveOwnFormatMapping).not.toHaveBeenCalled();
  });

  it("reads another bank's file with the mapping saved for its format", async () => {
    mocks.findFormatMapping.mockResolvedValue({
      mapping: OUT_AND_IN,
      isShared: true,
    });

    const parser = await parserOf(HORIZONTE);

    expect(parser).toMatchObject({
      ok: true,
      value: { id: "mapped-spreadsheet", bankId: "other" },
    });
    expect(mocks.findFormatMapping).toHaveBeenCalledWith(
      CONTEXT,
      OUT_AND_IN.header,
    );
    expect(mocks.saveOwnFormatMapping).not.toHaveBeenCalled();
  });

  it("saves a confirmed mapping whose balances add up for the person, and shares it", async () => {
    const parser = await parserOf(HORIZONTE, OUT_AND_IN);

    expect(parser).toMatchObject({ ok: true, value: { bankId: "other" } });
    expect(mocks.saveOwnFormatMapping).toHaveBeenCalledWith(
      CONTEXT,
      OUT_AND_IN,
    );
    expect(mocks.shareFormatMapping).toHaveBeenCalledWith(CONTEXT, OUT_AND_IN);
    expect(mocks.findFormatMapping).not.toHaveBeenCalled();
  });

  it("saves a confirmed mapping its balances can't prove for the person alone", async () => {
    const parser = await parserOf(WITHOUT_BALANCES, NO_BALANCE);

    expect(parser).toMatchObject({ ok: true, value: { bankId: "davivienda" } });
    expect(mocks.saveOwnFormatMapping).toHaveBeenCalledWith(
      CONTEXT,
      NO_BALANCE,
    );
    expect(mocks.shareFormatMapping).not.toHaveBeenCalled();
  });

  it("saves nothing for a confirmed mapping that doesn't read its file", async () => {
    const parser = await parserOf(WITHOUT_BALANCES, OUT_AND_IN);

    expect(parser).toEqual(
      err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason: "header" } }),
    );
    expect(mocks.saveOwnFormatMapping).not.toHaveBeenCalled();
    expect(mocks.shareFormatMapping).not.toHaveBeenCalled();
  });

  it("refuses a file whose saved mapping no longer reads it", async () => {
    const misread = formatMappingSchema.parse({
      ...OUT_AND_IN,
      dateOrder: "ymd",
    });
    mocks.findFormatMapping.mockResolvedValue({
      mapping: misread,
      isShared: false,
    });

    expect(await parserOf(HORIZONTE)).toMatchObject({
      ok: false,
      error: { code: "PARSE_FAILED" },
    });
  });

  it("doesn't know another bank's file whose format has no mapping", async () => {
    mocks.findFormatMapping.mockResolvedValue(undefined);

    expect(await parserOf(HORIZONTE)).toEqual(
      err({ code: APP_ERROR_CODE.UNKNOWN_FORMAT }),
    );
  });

  it("doesn't know content without a table, and looks for no mapping", async () => {
    const list: ExtractedContent = {
      type: "spreadsheet",
      sheets: [{ name: "", rows: [["Lista de mercado"], ["Arroz", "2"]] }],
    };

    expect(await parserOf(list)).toMatchObject({
      ok: false,
      error: { code: "UNKNOWN_FORMAT" },
    });
    expect(mocks.findFormatMapping).not.toHaveBeenCalled();
  });
});
