import { describe, expect, it } from "vitest";
import type { PdfLine, PdfSegment } from "../pdf-layout/pdf-layout.types";
import { findField } from "./card-pdf-fields.helpers";
import type { FieldSpec } from "./card-pdf-fields.helpers";

// Courier at 8 points: each character takes 4.8 points.
const CHARACTER = 4.8;

const segment = (text: string, left: number): PdfSegment => ({
  text,
  left,
  right: left + text.length * CHARACTER,
  items: [],
});

const line = (y: number, ...segments: readonly PdfSegment[]): PdfLine => ({
  page: 0,
  y,
  height: 8,
  segments,
});

const texts = (lines: readonly PdfLine[], spec: FieldSpec) =>
  findField(lines, spec)?.segments.map(({ text }) => text);

// A line of the minimum's detail: its label, the sign apart, and an amount.
const installments = (y: number, amount: string) =>
  line(
    y,
    segment("+ Cuota transacciones", 385),
    segment("$", 505),
    segment(amount, 560),
  );

describe("findField", () => {
  it("reads a value beside its label: the rest of its segment, else the next segment that isn't the sign alone", () => {
    const lines = [
      line(100, segment("Cupo total:  $ 5.000.000,00", 60)),
      line(
        112,
        segment("+ Saldo anterior", 95),
        segment("$", 215),
        segment("1.234,56", 240),
      ),
    ];

    expect(findField(lines, { label: "Cupo total:", place: "beside" })).toEqual(
      { text: "$ 5.000.000,00", segments: [lines[0]?.segments[0]] },
    );
    expect(
      texts(lines, { label: "+ Saldo anterior", place: "beside" }),
    ).toEqual(["+ Saldo anterior", "1.234,56"]);
  });

  it("reads a value under its label: the first segment below that overlaps it, within three heights", () => {
    const label = line(100, segment("Pagar antes de:", 280));
    const due = segment("oct. 15, 2026", 270);
    const spec: FieldSpec = { label: "Pagar antes de:", place: "under" };

    expect(
      findField(
        [label, line(110, segment("Cupo total:  $ 1,00", 60)), line(122, due)],
        spec,
      )?.text,
    ).toBe("oct. 15, 2026");
    expect(findField([label, line(125, due)], spec)).toBeUndefined();
  });

  it("finds a label whose words go on under it, in its column, until a line with an amount", () => {
    const lines = [
      installments(100, "10,00"),
      line(112, segment("entre 31 ago", 391)),
      installments(124, "20,00"),
      line(136, segment("anteriores", 391)),
    ];

    expect(
      texts(lines, { label: "+ Cuota transacciones entre", place: "beside" }),
    ).toEqual(["+ Cuota transacciones", "entre 31 ago", "10,00"]);
    expect(
      texts(lines, {
        label: "+ Cuota transacciones anteriores",
        place: "beside",
      }),
    ).toEqual(["+ Cuota transacciones", "anteriores", "20,00"]);
  });

  it.each([
    ["more than two heights under it", [line(117, segment("anteriores", 391))]],
    [
      "past a line out of its column",
      [
        line(108, segment("Cuotas", 330)),
        line(116, segment("anteriores", 391)),
      ],
    ],
    [
      "beside an amount",
      [line(112, segment("anteriores", 391), segment("5,00", 560))],
    ],
    [
      "on the next page",
      [{ ...line(112, segment("anteriores", 391)), page: 1 }],
    ],
  ])("joins no words %s", (_, below) => {
    expect(
      findField([installments(100, "10,00"), ...below], {
        label: "+ Cuota transacciones anteriores",
        place: "beside",
      }),
    ).toBeUndefined();
  });

  it("looks only at the segments a filter takes", () => {
    const lines = [
      line(
        100,
        segment("+ Intereses de mora", 95),
        segment("1,00", 240),
        segment("+ Intereses de mora", 385),
        segment("2,00", 560),
      ),
    ];
    const spec: FieldSpec = { label: "+ Intereses de mora", place: "beside" };

    expect(findField(lines, spec)?.text).toBe("1,00");
    expect(
      findField(lines, { ...spec, within: ({ left }) => left > 300 })?.text,
    ).toBe("2,00");
  });

  it("finds nothing when the label isn't printed, or its value isn't where it should be", () => {
    const lines = [line(100, segment("Pago mínimo:", 460))];

    expect(findField(lines, { label: "Pago Total:", place: "under" })).toBe(
      undefined,
    );
    expect(findField(lines, { label: "Pago mínimo:", place: "under" })).toBe(
      undefined,
    );
    expect(findField(lines, { label: "Pago mínimo:", place: "beside" })).toBe(
      undefined,
    );
  });
});
