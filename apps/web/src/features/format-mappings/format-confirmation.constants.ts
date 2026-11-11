import {
  COLUMN_ROLE,
  DATE_ORDER,
  DECIMAL_SEPARATOR,
  ROLES_PROBLEM,
} from "@xtrakto/core";
import type {
  ColumnRole,
  DateOrder,
  DecimalSeparator,
  RolesProblem,
} from "@xtrakto/core";

// "Confirma cómo leer tu extracto" (docs/ui/v8-14, 11.3a and 11.3b): what a
// file no parser knows reads with the LLM's proposal or the person's
// choices, for the person to correct and confirm.

/** Why the LLM proposed no roles for a file: the person chooses them (11.3b). */
export const NO_PROPOSAL = {
  AI_OFF: "ai_off",
  USER_MONTH: "ai_user_month",
  PLATFORM_BUDGET: "ai_platform_budget",
  AI_FAILED: "ai_failed",
} as const;

export const CONFIRMATION_COPY = {
  title: "Confirma cómo leer tu extracto",
  subtitle:
    "No conocíamos este formato. Revisa lo que entendimos: es un minuto y solo esta vez.",
  subtitleWithoutProposal:
    "No conocíamos este formato. Dinos cómo leerlo: es un minuto y solo esta vez.",
  newFormat: "Formato nuevo",
  unknownBank: "Banco no reconocido",
  columns: {
    title: "Lo que entendimos de cada columna",
    titleWithoutProposal: "Dinos qué es cada columna",
    description:
      "Arriba, lo que creemos que es. Abajo, cómo viene en tu archivo. Cambia lo que no esté bien.",
    descriptionWithoutProposal:
      "Encontramos la fecha: elige qué es cada una de las otras. Abajo, cómo viene en tu archivo.",
    caption:
      "Las primeras filas de tu archivo, con lo que creemos que es cada columna",
    choose: "Qué es la columna {name}",
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
    rereading: "Leyendo tu archivo de nuevo…",
    notRead: "Así no podemos leer todo el archivo.",
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
  // What stops the reading, and what to change (design-system.md §11).
  problem: {
    roles: "Faltan columnas por elegir",
    row: "No se lee la fila {row}",
    dateFormat: "“{column}” no es una fecha {order}.",
    amount: "“{column}” no es un monto escrito como {example}.",
    bothAmounts: "Tiene salida y entrada a la vez.",
    missing: "“{column}” está vacía.",
    direction: "“{column}” no dice si el dinero entra o sale.",
    noDates: {
      title: "No reconocemos las fechas de “{column}”",
      detail: "Elige cómo vienen en “Fechas”, abajo de la tabla.",
    },
    directionWords: {
      title: "No reconocemos las palabras de “{column}”",
      detail:
        "No son las que usan los bancos para decir si el dinero entra o sale.",
    },
    noMovements: {
      title: "No leímos ningún movimiento",
      detail: "Revisa qué columnas tienen el dinero.",
    },
    other: {
      title: "Así no podemos leer tu archivo",
      detail: "Revisa qué es cada columna.",
    },
  },
  bank: {
    label: "¿De qué banco es?",
    placeholder: "Elige el banco",
    hint: "Elige el banco para seguir.",
  },
  fixHint: "Corrige lo que no se lee para seguir.",
  confirm: "Confirmar y leer",
  leaveOut: "Algo está mal",
  onlyOnce: {
    title: "Solo lo confirmas una vez",
    detail:
      "La IA propone qué es cada columna; las cuentas las hace la app. La IA solo vio los nombres de las columnas y la forma de cada dato, nunca tus movimientos. Guardamos este formato y la próxima vez que subas un extracto de este banco se lee solo.",
    detailWithoutProposal:
      "Tú dices qué es cada columna y la app hace las cuentas. Guardamos este formato y la próxima vez que subas un extracto de este banco se lee solo.",
  },
} as const;

/** Why there's no proposal, before what the person does instead. */
export const NO_PROPOSAL_COPY: Readonly<
  Record<(typeof NO_PROPOSAL)[keyof typeof NO_PROPOSAL], string>
> = {
  [NO_PROPOSAL.AI_OFF]: "Ahora no podemos proponer qué es cada columna.",
  [NO_PROPOSAL.USER_MONTH]: "Este mes ya usaste la IA de tu plan.",
  [NO_PROPOSAL.PLATFORM_BUDGET]: "Este mes la IA ya no propone columnas.",
  [NO_PROPOSAL.AI_FAILED]: "La IA no pudo proponer qué es cada columna.",
};

/** What to choose when the roles read no table. */
export const ROLES_PROBLEM_COPY: Readonly<Record<RolesProblem, string>> = {
  [ROLES_PROBLEM.DATE]: "Elige qué columna tiene la fecha.",
  [ROLES_PROBLEM.DESCRIPTION]: "Elige qué columna tiene la descripción.",
  [ROLES_PROBLEM.BALANCE]: "Deja un solo saldo.",
  [ROLES_PROBLEM.REFERENCE]: "Deja una sola referencia.",
  [ROLES_PROBLEM.MONEY]:
    "Elige cómo viene el dinero: un monto con signo, una salida y una entrada, o un monto y si entra o sale.",
};

/** What each role is called above its column, in the order its choices list them. */
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
