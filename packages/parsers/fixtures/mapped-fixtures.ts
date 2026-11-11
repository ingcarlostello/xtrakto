import { COLUMN_ROLE } from "@xtrakto/core";
import mappedDirection from "./mapped-direction.json";
import mappedNewestFirst from "./mapped-newest-first.json";
import mappedNoBalance from "./mapped-no-balance.json";
import mappedOutIn from "./mapped-out-in.json";
import mappedTitleRows from "./mapped-title-rows.json";

const {
  DATE,
  DESCRIPTION,
  AMOUNT,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
  REFERENCE,
  DIRECTION,
  NONE,
} = COLUMN_ROLE;

/** Five invented banks' spreadsheets (11.1a). */
export const MAPPED_FIXTURES = {
  "mapped-out-in": mappedOutIn,
  "mapped-newest-first": mappedNewestFirst,
  "mapped-direction": mappedDirection,
  "mapped-no-balance": mappedNoBalance,
  "mapped-title-rows": mappedTitleRows,
};

export type MappedFixtureName = keyof typeof MAPPED_FIXTURES;

/** How a person would read each invented bank's columns. */
export const MAPPED_FIXTURE_MAPPINGS = {
  "mapped-out-in": {
    header: [
      "FECHA TRANS",
      "DETALLE",
      "OFICINA",
      "DEBITOS",
      "CREDITOS",
      "SALDO",
    ],
    columns: [DATE, DESCRIPTION, NONE, MONEY_OUT, MONEY_IN, BALANCE],
    dateOrder: "dmy",
    decimalSeparator: ",",
    bankId: "other",
  },
  "mapped-newest-first": {
    header: [
      "FECHA TRANSACCION",
      "CONCEPTO",
      "REFERENCIA",
      "MONTO",
      "SALDO DISPONIBLE",
    ],
    columns: [DATE, DESCRIPTION, REFERENCE, AMOUNT, BALANCE],
    dateOrder: "dmy",
    decimalSeparator: ",",
    bankId: "other",
  },
  "mapped-direction": {
    header: ["FECHA", "DESCRIPCION", "TIPO", "VALOR", "SALDO"],
    columns: [DATE, DESCRIPTION, DIRECTION, AMOUNT, BALANCE],
    dateOrder: "ymd",
    decimalSeparator: ".",
    directionWords: { in: ["C"], out: ["D"] },
    bankId: "other",
  },
  "mapped-no-balance": {
    header: ["FECHA", "DETALLE", "DEBITOS", "CREDITOS"],
    columns: [DATE, DESCRIPTION, MONEY_OUT, MONEY_IN],
    dateOrder: "dmy",
    decimalSeparator: ",",
    bankId: "other",
  },
  "mapped-title-rows": {
    header: [
      "FECHA",
      "FECHA VALOR",
      "DESCRIPCION",
      "DOCUMENTO",
      "VALOR",
      "SALDO",
    ],
    columns: [DATE, NONE, DESCRIPTION, NONE, AMOUNT, BALANCE],
    dateOrder: "dmy",
    decimalSeparator: ",",
    bankId: "other",
  },
} as const;
