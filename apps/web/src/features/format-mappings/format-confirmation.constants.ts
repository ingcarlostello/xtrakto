import { COLUMN_ROLE, DATE_ORDER, DECIMAL_SEPARATOR } from "@xtrakto/core";
import type { ColumnRole, DateOrder, DecimalSeparator } from "@xtrakto/core";

// "Confirma cómo leer tu extracto" (docs/ui/v8-14, 11.3a): what the LLM's
// proposal makes of a file no parser knows, for the person to confirm.

export const CONFIRMATION_COPY = {
  title: "Confirma cómo leer tu extracto",
  subtitle:
    "No conocíamos este formato. Revisa lo que entendimos: es un minuto y solo esta vez.",
  newFormat: "Formato nuevo",
  unknownBank: "Banco no reconocido",
  columns: {
    title: "Lo que entendimos de cada columna",
    description:
      "Arriba, lo que creemos que es. Abajo, cómo viene en tu archivo.",
    caption:
      "Las primeras filas de tu archivo, con lo que creemos que es cada columna",
    opening: "Saldo inicial, no es un movimiento:",
    notMovement: "No es un movimiento:",
    more: { one: "Y 1 fila más.", other: "Y {count} filas más." },
    openingNote:
      "La fila “{text}” se usa como saldo inicial, no como movimiento.",
  },
  format: {
    title: "Formato del archivo",
    numbers: "Números",
    dates: "Fechas",
    currency: "Moneda",
    currencyValue: "pesos (COP)",
    starts: "Empieza en",
    ends: "Termina en",
    row: "fila",
  },
  test: {
    title: "Prueba con tu archivo",
    read: {
      one: "Leímos 1 movimiento con este mapeo.",
      other: "Leímos {count} movimientos con este mapeo.",
    },
    opening: "Saldo inicial",
    moneyIn: "+ Entradas",
    moneyOut: "− Salidas",
    closing: "Saldo final calculado",
    verified: "Cuadra con tu extracto",
    off: "No cuadra por",
    offWithoutDifference: "No cuadra",
    fileSays: "El archivo dice {amount} al {day}.",
    noBalances: "Este archivo no trae saldos",
    checkWays: "Revisa que las entradas y las salidas se vean bien.",
  },
  bank: {
    label: "¿De qué banco es?",
    placeholder: "Elige el banco",
    hint: "Elige el banco para seguir.",
  },
  confirm: "Confirmar y leer",
  leaveOut: "Algo está mal",
  onlyOnce: {
    title: "Solo lo confirmas una vez",
    detail:
      "La IA propone qué es cada columna; las cuentas las hace la app. La IA solo vio los nombres de las columnas y la forma de cada dato, nunca tus movimientos. Guardamos este formato y la próxima vez que subas un extracto de este banco se lee solo.",
  },
} as const;

/** What each role is called above its column. */
export const ROLE_LABELS: Readonly<Record<ColumnRole, string>> = {
  [COLUMN_ROLE.DATE]: "Fecha",
  [COLUMN_ROLE.DESCRIPTION]: "Descripción",
  [COLUMN_ROLE.AMOUNT]: "Monto",
  [COLUMN_ROLE.MONEY_OUT]: "Salida",
  [COLUMN_ROLE.MONEY_IN]: "Entrada",
  [COLUMN_ROLE.BALANCE]: "Saldo",
  [COLUMN_ROLE.REFERENCE]: "Referencia",
  [COLUMN_ROLE.DIRECTION]: "Entra o sale",
  [COLUMN_ROLE.NONE]: "Ignorar",
};

/** How a file writes its dates, as the person reads it. */
export const DATE_ORDER_LABELS: Readonly<Record<DateOrder, string>> = {
  [DATE_ORDER.DAY_MONTH_YEAR]: "día/mes/año",
  [DATE_ORDER.MONTH_DAY_YEAR]: "mes/día/año",
  [DATE_ORDER.YEAR_MONTH_DAY]: "año/mes/día",
};

/** How a file writes its amounts, by an example. */
export const NUMBER_LABELS: Readonly<Record<DecimalSeparator, string>> = {
  [DECIMAL_SEPARATOR.COMMA]: "1.234,56",
  [DECIMAL_SEPARATOR.POINT]: "1,234.56",
};
