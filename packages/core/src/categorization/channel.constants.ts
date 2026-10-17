import type { ChannelDefinition } from "./channel.types";

/**
 * How the money moved, from the start of the bank's text (design-system.md
 * §9): not a category. The first one that matches wins; a description that
 * only mentions a _corresponsal_ is checked last.
 */
export const CHANNELS = [
  { id: "pse", labelEs: "PSE", startsWith: ["PAGO PSE"] },
  { id: "bre_b_key", labelEs: "Llave Bre-B", startsWith: ["PAGO LLAVE"] },
  { id: "qr", labelEs: "QR", startsWith: ["PAGO QR", "TRANSF QR"] },
  {
    id: "nequi",
    labelEs: "Nequi",
    startsWith: ["TRANSFERENCIAS A NEQUI", "TRANSFERENCIA DESDE NEQUI"],
  },
  { id: "atm", labelEs: "Cajero", startsWith: ["RETIRO CAJERO"] },
  { id: "debit_card", labelEs: "Débito", startsWith: ["COMPRA EN"] },
  {
    id: "virtual_branch",
    labelEs: "Sucursal virtual",
    startsWith: ["PAGO SUC VIRT", "TRANSFERENCIA CTA SUC VIRTUAL"],
  },
  {
    id: "transfer",
    labelEs: "Transferencia",
    startsWith: ["TRANSF A", "TRANSF DE", "PAGO INTERBANC"],
  },
  { id: "banking_agent", labelEs: "Corresponsal", words: ["CORRESPONSAL"] },
] as const satisfies readonly ChannelDefinition[];
