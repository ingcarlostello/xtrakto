import type { CoverageStatus } from "./coverage-timeline.types";

/** How many months a coverage timeline shows at most. */
export const TIMELINE_MONTHS = 12;

// What a coverage timeline says (design-system.md §9, coverage timeline).
export const COVERAGE_COPY = {
  // Its sentence, one per run of months: "Enero a septiembre de 2026
  // completo y verificado. Octubre va en movimientos, sin saldo todavía."
  ofYear: "de",
  through: "a",
  and: "y",
  verified: "completo y verificado.",
  unverified: {
    now: { one: "va", other: "van" },
    before: { one: "está", other: "están" },
    inMovements: "en movimientos,",
    noBalanceNow: "sin saldo todavía.",
    noBalanceBefore: "sin saldo para verificar.",
  },
  missing: {
    not: "no",
    it: { one: "lo", other: "los" },
    have: "tienes",
    yet: "todavía",
  },
  legend: {
    verified: "Extracto trimestral, verificado",
    alsoInMovements:
      "También en movimientos (rangos que se cruzan, sin duplicar)",
    unverified: "Sin saldo para verificar",
    missing: "No lo tienes",
  },
  legendLabel: "Qué significa cada mes",
  // The latest month several overlapping movements files brought: "Agosto
  // lo subiste también en 3 archivos de movimientos con fechas que se
  // cruzan (1–7, 1–15 y 15–31). Los juntamos sin duplicar y les agregamos 12
  // referencias."
  note: {
    uploaded: "lo subiste",
    also: "también",
    in: "en",
    files: { one: "archivo de movimientos", other: "archivos de movimientos" },
    overlapping: "con fechas que se cruzan",
    joined: "Los juntamos sin duplicar",
    added: "y les agregamos",
    references: { one: "referencia", other: "referencias" },
  },
} as const;

// design-system.md §9, coverage timeline: a month's color says what saved
// it; its sentence or the legend says it in words.
export const STATUS_CLASSES: Record<CoverageStatus, string> = {
  verified: "bg-income",
  unverified:
    "bg-[repeating-linear-gradient(90deg,var(--color-ink-faint)_0_3px,var(--color-chart-axis)_3px_6px)]",
  missing: "bg-ring-track",
};
