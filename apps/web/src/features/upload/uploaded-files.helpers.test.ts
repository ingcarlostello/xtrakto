import { amountMinorSchema, periodSchema } from "@xtrakto/core";
import type { IngestionStats } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { JobOutcome, UploadJob } from "./upload.types";
import { uploadedFileView } from "./uploaded-files.helpers";

const QUARTER = periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" });
const OCTOBER = periodSchema.parse({ from: "2026-10-01", to: "2026-10-08" });
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

const done = (
  job: UploadJob,
  counts: Partial<IngestionStats>,
  rest: Partial<JobOutcome> = {},
): UploadJob => ({
  ...job,
  outcome: {
    stats: stats(counts),
    statementId: "s1",
    accountId: "a1",
    bankId: "bancolombia",
    period: QUARTER,
    balance: "verified",
    matches: NO_MATCHES,
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

  it("says a PDF came as a PDF, done or still in process", () => {
    const pdf: UploadJob = {
      ...quarterly,
      formatId: "bancolombia-savings-quarterly-pdf",
    };

    expect(uploadedFileView(done(pdf, {})).detail).toBe(
      "PDF · 33 movimientos · cuadra al centavo",
    );
    expect(uploadedFileView({ ...pdf, status: "processing" }).detail).toBe(
      "PDF",
    );
  });

  describe("the references a file's movements gave or took (10.1b)", () => {
    const withReferences = (references: number) => ({
      matches: { ...NO_MATCHES, matched: 48, references },
    });

    it("completes a file that added references and nothing new", () => {
      expect(
        uploadedFileView(
          done(
            movements,
            { total: 48, added: 0, covered: 48 },
            { period: OCTOBER, balance: "none", ...withReferences(12) },
          ),
        ),
      ).toEqual({
        title: "Movimientos 1–8 oct 2026",
        detail: "Excel · 48 ya los tenías · 12 referencias agregadas",
        badge: { label: "Completado", variant: "info" },
      });
    });

    it("says an export with new movements is verified once its quarterly statement agrees with it", () => {
      expect(
        uploadedFileView(
          done(
            movements,
            { total: 14, added: 14 },
            {
              period: OCTOBER,
              balance: "none",
              matches: { ...NO_MATCHES, matched: 14, verifiedBy: [QUARTER] },
            },
          ),
        ),
      ).toEqual({
        title: "Movimientos 1–8 oct 2026",
        detail: "Excel · 14 nuevos · verificado por tu extracto trimestral",
        badge: { label: "Verificado", variant: "ok" },
      });
    });

    it("adds them to a quarterly statement's line and to an export's with new movements", () => {
      expect(
        uploadedFileView(done(quarterly, {}, withReferences(1))).detail,
      ).toBe(
        "Excel · 33 movimientos · cuadra al centavo · 1 referencia agregada",
      );
      expect(
        uploadedFileView(
          done(
            movements,
            { total: 21, added: 6 },
            { period: OCTOBER, balance: "none", ...withReferences(3) },
          ),
        ).detail,
      ).toBe(
        "Excel · 6 nuevos · 3 referencias agregadas · sin saldo para verificar",
      );
    });
  });

  it("writes one movement already had in the singular", () => {
    expect(
      uploadedFileView(done(quarterly, { total: 1, added: 0, skipped: 1 }))
        .detail,
    ).toBe("Excel · 1 ya lo tenías · nada nuevo");
  });

  describe("another bank's file", () => {
    const mapped: UploadJob = { ...movements, formatId: "mapped-spreadsheet" };

    it("names it by its account's bank once saved, since it may have been a CSV", () => {
      const saved = done(
        mapped,
        { total: 10, added: 10 },
        { bankId: "davivienda" },
      );

      expect(uploadedFileView(saved).detail).toBe(
        "Davivienda · 10 movimientos · cuadra al centavo",
      );
      expect(uploadedFileView({ ...mapped, status: "processing" }).detail).toBe(
        "",
      );
    });

    it("says another bank's file with balances verified it", () => {
      const verified = done(
        mapped,
        { total: 21, added: 6 },
        {
          bankId: "davivienda",
          period: OCTOBER,
          balance: "none",
          matches: { ...NO_MATCHES, matched: 15, verifiedBy: [OCTOBER] },
        },
      );

      expect(uploadedFileView(verified).detail).toBe(
        "Davivienda · 6 nuevos · verificado por tu archivo con saldos",
      );
    });
  });
});
