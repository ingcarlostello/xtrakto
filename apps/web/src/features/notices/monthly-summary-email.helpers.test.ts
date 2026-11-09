import { describe, expect, it } from "vitest";
import { monthlySummaryEmail } from "./monthly-summary-email.helpers";

const UNSUBSCRIBE = "https://xtrakto.site/unsubscribe?token=abc";
const OCTOBER = { year: 2026, month: 10 };
const DECEMBER = { year: 2026, month: 12 };

describe("monthlySummaryEmail", () => {
  it("links the month's summary when it's ready", () => {
    const { subject, text, html } = monthlySummaryEmail(
      { kind: "ready", accountId: "a1" },
      OCTOBER,
      UNSUBSCRIBE,
    );

    expect(subject).toBe("Tu resumen de octubre está listo");
    for (const body of [text, html]) {
      expect(body).toContain("Ver mi resumen");
      expect(body).toContain("https://xtrakto.site/?");
      expect(body).toContain("account=a1");
      expect(body).toContain("period=2026-10");
    }
  });

  it("asks for the month's movements while its quarter goes on", () => {
    const { subject, text } = monthlySummaryEmail(
      { kind: "missing" },
      OCTOBER,
      UNSUBSCRIBE,
    );

    expect(subject).toBe("Te falta octubre");
    expect(text).toContain(
      "Para ver tu resumen del mes, sube los movimientos de octubre.",
    );
    expect(text).toContain("Ir a Subir: https://xtrakto.site/upload");
  });

  it("asks for the quarterly statement once its quarter ended, with its year from the next", () => {
    const { text } = monthlySummaryEmail(
      { kind: "missing" },
      DECEMBER,
      UNSUBSCRIBE,
    );

    expect(text).toContain("sube el extracto trimestral oct–dic 2026.");
  });

  it("says what's left of a month it has in part", () => {
    const { subject, text } = monthlySummaryEmail(
      { kind: "partial" },
      OCTOBER,
      UNSUBSCRIBE,
    );

    expect(subject).toBe("Te falta parte de octubre");
    expect(text).toContain(
      "Para ver el mes completo, sube los movimientos de octubre.",
    );
  });

  it("says why it arrived, and its way out, in HTML and text", () => {
    const { text, html } = monthlySummaryEmail(
      { kind: "missing" },
      OCTOBER,
      UNSUBSCRIBE,
    );

    for (const body of [text, html]) {
      expect(body).toContain("activaste el resumen del mes");
      expect(body).toContain("Dejar de recibir este aviso");
      expect(body).toContain(UNSUBSCRIBE);
    }
  });
});
