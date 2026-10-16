import { amountMinorSchema, periodSchema } from "@xtrakto/core";
import type { IngestionStats } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { JobOutcome, UploadJob } from "./upload.types";
import { uploadedFileView } from "./uploaded-files.helpers";

const QUARTER = periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" });
const OCTOBER = periodSchema.parse({ from: "2026-10-01", to: "2026-10-08" });

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

const done = (
  job: UploadJob,
  counts: Partial<IngestionStats>,
  rest: Partial<JobOutcome> = {},
): UploadJob => ({
  ...job,
  outcome: {
    stats: stats(counts),
    accountId: "a1",
    period: QUARTER,
    balance: "verified",
    ...rest,
  },
});

const unverified = (
  counts: Partial<IngestionStats>,
  differenceMinor?: number,
) =>
  done(
    quarterly,
    counts,
    differenceMinor === undefined
      ? { balance: "unverified" }
      : {
          balance: "unverified",
          differenceMinor: amountMinorSchema.parse(differenceMinor),
        },
  );

describe("uploadedFileView", () => {
  it.each([
    {
      case: "a quarterly statement that reconciles",
      job: done(quarterly, {}),
      view: {
        title: "Extracto trimestral jul–sep 2026",
        detail: "Excel · 33 movimientos · cuadra al centavo",
        badge: { label: "Verificado", variant: "ok" },
      },
    },
    {
      case: "one that starts where the previous quarter's ended",
      job: done(
        quarterly,
        {},
        {
          chainedTo: periodSchema.parse({
            from: "2026-03-31",
            to: "2026-06-30",
          }),
        },
      ),
      view: {
        title: "Extracto trimestral jul–sep 2026",
        detail: "Excel · 33 movimientos · encadenado",
        badge: { label: "Verificado", variant: "ok" },
      },
    },
    {
      case: "a movements export, without balances",
      job: done(
        movements,
        { total: 21, added: 21 },
        { period: OCTOBER, balance: "none" },
      ),
      view: {
        title: "Movimientos 1–8 oct 2026",
        detail: "Excel · 21 nuevos · sin saldo para verificar",
        badge: { label: "Sin verificar", variant: "neutral" },
      },
    },
    {
      case: "a file the account already had",
      job: done(
        movements,
        { total: 63, added: 0, covered: 63 },
        { period: OCTOBER, balance: "none" },
      ),
      view: {
        title: "Movimientos 1–8 oct 2026",
        detail: "Excel · 63 ya los tenías · nada nuevo",
        badge: { label: "Sin cambios", variant: "neutral" },
      },
    },
  ])("shows $case", ({ job, view }) => {
    expect(uploadedFileView(job)).toEqual(view);
  });

  it("puts a statement that doesn't reconcile first, though it added nothing", () => {
    expect(uploadedFileView(unverified({ added: 0 }, -81_000))).toEqual({
      title: "Extracto trimestral jul–sep 2026",
      detail: "Excel · 33 movimientos · no cuadra por $810",
      badge: { label: "No cuadra", variant: "attention" },
    });
    expect(uploadedFileView(unverified({ added: 0 })).detail).toBe(
      "Excel · 33 movimientos · no cuadra",
    );
  });

  it("names a job without a statement by its format, with why it failed", () => {
    const failed = { ...quarterly, status: "failed" } as const;

    expect(uploadedFileView({ ...failed, errorCode: "PARSE_FAILED" })).toEqual({
      title: "Extracto trimestral",
      detail: "No pudimos leer este extracto completo",
      badge: { label: "No se procesó", variant: "attention" },
    });
    expect(uploadedFileView(failed).detail).toBe("No pudimos procesarlo");
    expect(uploadedFileView({ ...movements, status: "processing" })).toEqual({
      title: "Movimientos",
      detail: "Excel",
      badge: { label: "En proceso", variant: "neutral" },
    });
  });

  it("writes one movement already had in the singular", () => {
    expect(
      uploadedFileView(done(quarterly, { total: 1, added: 0, skipped: 1 }))
        .detail,
    ).toBe("Excel · 1 ya lo tenías · nada nuevo");
  });
});
