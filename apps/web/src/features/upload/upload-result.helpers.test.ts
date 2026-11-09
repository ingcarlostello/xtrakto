import { amountMinorSchema, periodSchema } from "@xtrakto/core";
import type { IngestionStats } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { resultView } from "./upload-result.helpers";
import { RESULT_COPY } from "./upload-result.constants";
import type { JobOutcome, PdfReading, UploadJob } from "./upload.types";

const QUARTER = periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" });
const PREVIOUS_QUARTER = periodSchema.parse({
  from: "2026-03-31",
  to: "2026-06-30",
});
const JULY = periodSchema.parse({ from: "2026-07-01", to: "2026-07-31" });
const NO_MATCHES = { matched: 0, dayApart: 0, references: 0, verifiedBy: [] };

const quarterly: UploadJob = {
  jobId: "job",
  status: "done",
  isSlow: false,
  formatId: "bancolombia-savings-quarterly",
};
const movements: UploadJob = {
  ...quarterly,
  formatId: "bancolombia-movements-export",
};

const stats = (counts: Partial<IngestionStats>): IngestionStats => ({
  total: 33,
  added: 33,
  skipped: 0,
  covered: 0,
  hidden: 0,
  replaced: 0,
  ...counts,
});

const outcome = (
  counts: Partial<IngestionStats>,
  rest: Partial<JobOutcome> = {},
): JobOutcome => ({
  stats: stats(counts),
  statementId: "s1",
  accountId: "a1",
  period: QUARTER,
  balance: "verified",
  matches: NO_MATCHES,
  ...rest,
});

const detailOf = (job: UploadJob, result: JobOutcome, title: string) =>
  resultView(job, result).steps.find((step) => step.title === title)?.detail;

describe("resultView", () => {
  it("shows a first quarterly statement: every movement new, its balances verified", () => {
    expect(resultView(quarterly, outcome({}))).toEqual({
      isOk: true,
      title: RESULT_COPY.read,
      counts: [
        { value: "33", label: "movimientos en el archivo" },
        { value: "0", label: "ya los tenías: no se duplican" },
        { value: "33", label: "nuevos" },
      ],
      pill: {
        tone: "ok",
        title: "Saldo verificado",
        detail: "33 movimientos cuadran",
      },
      steps: [
        {
          title: "Leído en tu navegador",
          detail: "33 movimientos",
          isOk: true,
        },
        {
          title: "Reconocido",
          detail: "Bancolombia · Extracto trimestral · jul–sep 2026",
          isOk: true,
        },
        {
          title: "Revisando duplicados",
          detail: "Ninguno estaba en tu cuenta.",
          isOk: true,
        },
        {
          title: "Saldo verificado",
          detail: RESULT_COPY.verifiedDetail,
          isOk: true,
        },
      ],
      movementsHref: {
        pathname: "/transactions",
        query: { account: "a1", period: "2026-q3" },
      },
    });
  });

  it("links an export to its account's movements in its month", () => {
    const augustFirstHalf = outcome(
      {},
      {
        balance: "none",
        period: periodSchema.parse({ from: "2026-08-01", to: "2026-08-15" }),
      },
    );

    expect(resultView(quarterly, augustFirstHalf).movementsHref).toEqual({
      pathname: "/transactions",
      query: { account: "a1", period: "2026-08" },
    });
  });

  it("says a quarterly statement starts where the previous quarter's ended", () => {
    const chained = outcome({}, { chainedTo: PREVIOUS_QUARTER });

    expect(resultView(quarterly, chained).pill).toEqual({
      tone: "ok",
      title: "Encadenado",
      detail: "Empieza donde terminó abr–jun 2026",
    });
    expect(resultView(quarterly, chained).steps.at(-1)).toMatchObject({
      title: "Saldo verificado",
    });
  });

  it("counts what a quarterly statement takes over from the movements of its days", () => {
    const view = resultView(quarterly, outcome({ added: 19, hidden: 14 }));

    expect(view.counts.map(({ value }) => value)).toEqual(["33", "14", "19"]);
    expect(
      detailOf(
        quarterly,
        outcome({ added: 19, hidden: 14 }),
        "Revisando duplicados",
      ),
    ).toBe(`14 movimientos ${RESULT_COPY.hadIn} ${RESULT_COPY.hiddenNote}`);
  });

  it("says a movements export a quarterly statement covers was already there, without balances", () => {
    const covered = outcome(
      { total: 14, added: 0, covered: 14 },
      { period: JULY, balance: "none" },
    );
    const view = resultView(movements, covered);

    expect(view).toMatchObject({
      isOk: true,
      title: RESULT_COPY.alreadyHad,
      pill: {
        tone: "none",
        title: "Sin saldo para verificar",
        detail: "Archivo de movimientos",
      },
      // "Ver lo que tienes" instead of its movements (10.2d, v8-13).
      showsWhatYouHave: true,
    });
    expect(view.movementsHref).toBeUndefined();
    expect(detailOf(movements, covered, "Reconocido")).toBe(
      "Bancolombia · Movimientos · 1–31 jul 2026",
    );
    expect(detailOf(movements, covered, "Revisando duplicados")).toBe(
      `14 movimientos ${RESULT_COPY.hadIn} ${RESULT_COPY.coveredNote}`,
    );
    expect(view.steps.at(-1)).toEqual({
      title: "Este archivo no trae saldos",
      detail:
        "Los movimientos de la Sucursal Virtual no los incluyen. Los verificamos cuando subas el extracto trimestral de ese periodo.",
      isOk: true,
    });
  });

  it("says the same file again was already there", () => {
    expect(
      resultView(quarterly, outcome({ added: 0, skipped: 33 })).title,
    ).toBe(RESULT_COPY.alreadyHad);
  });

  it("offers the check of today's balance when the outcome does (10.3)", () => {
    const offer = { accountId: "a1" };
    const offered = outcome(
      {},
      { period: JULY, balance: "none", todaysBalance: offer },
    );

    expect(resultView(movements, offered).todaysBalance).toBe(offer);
    expect(resultView(movements, outcome({})).todaysBalance).toBeUndefined();
  });

  it("says when it replaced a version that didn't reconcile", () => {
    expect(resultView(quarterly, outcome({ replaced: 1 })).title).toBe(
      RESULT_COPY.replaced,
    );
    // A replacement shows its movements, even with nothing new.
    expect(
      resultView(quarterly, outcome({ replaced: 1, added: 0 })),
    ).toMatchObject({ movementsHref: { pathname: "/transactions" } });
  });

  it("shows a statement that doesn't reconcile on the attention surface, counting nothing", () => {
    const offBy = outcome(
      { added: 0 },
      {
        balance: "unverified",
        differenceMinor: amountMinorSchema.parse(-81_000),
      },
    );

    expect(resultView(quarterly, offBy)).toMatchObject({
      isOk: false,
      title: "El saldo final no cuadra por $810",
      note: RESULT_COPY.notReconciledNote,
      counts: [{ value: "33", label: "movimientos en el archivo" }],
      pill: {
        tone: "attention",
        title: "No cuadra por $810",
        detail: "Revisa el archivo",
      },
    });
    expect(detailOf(quarterly, offBy, "Revisando duplicados")).toBe(
      RESULT_COPY.keptApart,
    );
    expect(resultView(quarterly, offBy).steps.at(-1)).toMatchObject({
      title: RESULT_COPY.notReconciled,
      isOk: false,
    });
    // Its movements count nowhere: it links to where its balance breaks.
    expect(resultView(quarterly, offBy).movementsHref).toBeUndefined();
    expect(resultView(quarterly, offBy).breaksHref).toBe(
      "/transactions/breaks/s1",
    );
  });

  it("says a statement doesn't reconcile when its closing balance matches but a row breaks", () => {
    const view = resultView(
      quarterly,
      outcome({ added: 0 }, { balance: "unverified" }),
    );

    expect(view.title).toBe(RESULT_COPY.notReconciled);
    expect(view.pill.title).toBe(RESULT_COPY.notReconciledShort);
  });

  describe("what a movements export matched (10.1b)", () => {
    const AUGUST_1_TO_15 = periodSchema.parse({
      from: "2026-08-01",
      to: "2026-08-15",
    });
    const OCTOBER_TO_DECEMBER = periodSchema.parse({
      from: "2026-09-30",
      to: "2026-12-31",
    });
    const exported = (
      counts: Partial<IngestionStats>,
      matches: Partial<JobOutcome["matches"]>,
    ) =>
      outcome(
        { total: 48, added: 0, covered: 48, ...counts },
        {
          period: AUGUST_1_TO_15,
          balance: "none",
          matches: { ...NO_MATCHES, ...matches },
        },
      );

    it("verifies a file its quarterly statement repeats, interest a day apart, and counts the references it added", () => {
      const result = exported(
        {},
        { matched: 48, dayApart: 3, references: 12, verifiedBy: [QUARTER] },
      );
      const view = resultView(movements, result);

      // Nothing new, but it brought references: v8-08's title.
      expect(view.title).toBe(RESULT_COPY.read);
      expect(view.counts.at(-1)).toEqual({
        value: "12",
        label: "referencias agregadas",
        isInfo: true,
      });
      expect(view.pill).toEqual({
        tone: "ok",
        title: "Verificado por tu extracto trimestral",
        detail:
          "Este tipo de archivo no trae saldos; lo comparamos con jul–sep 2026 y coincide.",
      });
      expect(detailOf(movements, result, "Revisando duplicados")).toBe(
        "48 movimientos ya estaban en tu extracto trimestral. Los intereses vienen con un día de diferencia entre archivos; igual los reconocimos.",
      );
      expect(view.steps.slice(-2)).toEqual([
        {
          title: "Verificado con tu extracto trimestral",
          detail:
            "Este archivo no trae saldos, pero todo coincide con jul–sep 2026.",
          isOk: true,
        },
        {
          title: "Clasificado",
          detail: "12 referencias nuevas, como números de Nequi o de PSE.",
          isOk: true,
        },
      ]);
    });

    it("names each quarterly statement that verifies a file across them", () => {
      const result = exported(
        {},
        { matched: 48, verifiedBy: [QUARTER, OCTOBER_TO_DECEMBER] },
      );

      expect(resultView(movements, result).pill.detail).toBe(
        "Este tipo de archivo no trae saldos; lo comparamos con jul–sep 2026 y oct–dic 2026 y coincide.",
      );
    });

    it("says how many of a file only partly covered its quarterly statement had", () => {
      const result = exported(
        { total: 21, added: 6, covered: 15 },
        { matched: 15 },
      );
      const view = resultView(movements, result);

      expect(view.counts).toHaveLength(3);
      expect(view.pill.title).toBe("Sin saldo para verificar");
      expect(detailOf(movements, result, "Revisando duplicados")).toBe(
        "15 movimientos ya estaban en tu extracto trimestral.",
      );
      expect(view.steps.at(-1)).toEqual({
        title: "Este archivo no trae saldos",
        detail:
          "15 movimientos coinciden con tu extracto trimestral; los demás, cuando subas el de su periodo.",
        isOk: true,
      });
    });

    it("says which of a file's movements came in its quarterly statement when another file had the rest", () => {
      const result = exported(
        { covered: 28, skipped: 20 },
        { matched: 28, verifiedBy: [QUARTER] },
      );

      expect(detailOf(movements, result, "Revisando duplicados")).toBe(
        "48 movimientos ya estaban en tu cuenta: no se duplican. De ellos, 28 venían en tu extracto trimestral.",
      );
    });

    it("counts the references a quarterly statement took from the files saved before it", () => {
      const result = outcome(
        { added: 19, hidden: 14 },
        {
          matches: {
            matched: 14,
            dayApart: 2,
            references: 1,
            verifiedBy: [],
          },
        },
      );
      const view = resultView(quarterly, result);

      expect(view.counts.map(({ value }) => value)).toEqual([
        "33",
        "14",
        "19",
        "1",
      ]);
      expect(view.counts.at(-1)?.label).toBe("referencia agregada");
      expect(detailOf(quarterly, result, "Revisando duplicados")).toBe(
        `14 movimientos ${RESULT_COPY.hadIn} ${RESULT_COPY.hiddenNote} ${RESULT_COPY.interestDayApart}`,
      );
      expect(view.steps.at(-1)?.detail).toBe(
        "1 referencia nueva, como números de Nequi o de PSE.",
      );
    });
  });

  it("writes one movement in the singular", () => {
    const view = resultView(quarterly, outcome({ total: 1, added: 1 }));

    expect(view.counts[0]).toEqual({
      value: "1",
      label: "movimiento en el archivo",
    });
    expect(view.pill.detail).toBe("1 movimiento cuadra");
  });

  describe("a PDF's first step", () => {
    const movementsPdf: UploadJob = {
      ...quarterly,
      formatId: "bancolombia-movements-export-pdf",
    };
    const august = outcome(
      { total: 48, added: 0, covered: 48 },
      { balance: "none" },
    );
    const readOf = (result: JobOutcome, pdf?: PdfReading) =>
      resultView(movementsPdf, result, pdf).steps[0];

    it("says its pages and rows, and the descriptions joined from two lines", () => {
      expect(readOf(august, { pageCount: 2, joinedDescriptions: 3 })).toEqual({
        title: "Leído en tu navegador",
        detail:
          "2 páginas · 48 filas. Unimos 3 descripciones partidas en dos líneas.",
        isOk: true,
      });
    });

    it("says only its pages and rows when nothing was joined", () => {
      expect(
        readOf(august, { pageCount: 2, joinedDescriptions: 0 })?.detail,
      ).toBe("2 páginas · 48 filas");
    });

    it("writes one page, row and description in the singular", () => {
      const one = outcome({ total: 1, added: 1 }, { balance: "none" });

      expect(readOf(one, { pageCount: 1, joinedDescriptions: 1 })?.detail).toBe(
        "1 página · 1 fila. Unimos 1 descripción partida en dos líneas.",
      );
    });

    it("says its movements once the page no longer holds what it read", () => {
      expect(readOf(august)?.detail).toBe("48 movimientos");
    });
  });
});
