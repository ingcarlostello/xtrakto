import { amountMinorSchema, periodSchema } from "@xtrakto/core";
import type { IngestionStats } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { resultView } from "./upload-result.helpers";
import { RESULT_COPY } from "./upload.constants";
import type { JobOutcome, UploadJob } from "./upload.types";

const QUARTER = periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" });
const JULY = periodSchema.parse({ from: "2026-07-01", to: "2026-07-31" });

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
  period: QUARTER,
  balance: "verified",
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
    });
    expect(detailOf(movements, covered, "Reconocido")).toBe(
      "Bancolombia · Movimientos · 1–31 jul 2026",
    );
    expect(detailOf(movements, covered, "Revisando duplicados")).toBe(
      `14 movimientos ${RESULT_COPY.hadIn} ${RESULT_COPY.coveredNote}`,
    );
    expect(view.steps.at(-1)).toEqual({
      title: RESULT_COPY.noBalance,
      detail: RESULT_COPY.noBalanceDetail,
      isOk: true,
    });
  });

  it("says the same file again was already there", () => {
    expect(
      resultView(quarterly, outcome({ added: 0, skipped: 33 })).title,
    ).toBe(RESULT_COPY.alreadyHad);
  });

  it("says when it replaced a version that didn't reconcile", () => {
    expect(resultView(quarterly, outcome({ replaced: 1 })).title).toBe(
      RESULT_COPY.replaced,
    );
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
  });

  it("says a statement doesn't reconcile when its closing balance matches but a row breaks", () => {
    const view = resultView(
      quarterly,
      outcome({ added: 0 }, { balance: "unverified" }),
    );

    expect(view.title).toBe(RESULT_COPY.notReconciled);
    expect(view.pill.title).toBe(RESULT_COPY.notReconciledShort);
  });

  it("writes one movement in the singular", () => {
    const view = resultView(quarterly, outcome({ total: 1, added: 1 }));

    expect(view.counts[0]).toEqual({
      value: "1",
      label: "movimiento en el archivo",
    });
    expect(view.pill.detail).toBe("1 movimiento cuadra");
  });
});
