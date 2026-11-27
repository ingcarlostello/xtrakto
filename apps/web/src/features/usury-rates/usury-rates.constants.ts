/**
 * The Superintendencia Financiera's "Histórico Tasa de Usura" (12.4a, gate
 * 12.4, confirmed by the human): an Excel at a fixed link, updated at each
 * month's end with the next month's certified rates.
 */
export const USURY_HISTORY = {
  url: "https://www.superfinanciera.gov.co/loader.php?lServicio=Tools2&lTipo=descargas&lFuncion=descargar&idFile=1069287",
  source: "Superintendencia Financiera de Colombia, Histórico Tasa de Usura",
  /** How long a download may take before the run fails and retries. */
  timeoutMs: 20_000,
} as const;
