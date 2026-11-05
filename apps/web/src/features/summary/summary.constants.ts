import type { CategoryId } from "@xtrakto/core";
import type { Noun } from "@/utils/count-text.utils";

// The summary (docs/ui/v8-01): an account's period at a glance.
export const SUMMARY_COPY = {
  title: "Resumen de tu cuenta de ahorros",
  upload: "Subir extracto",
  glanceTitle: {
    quarter: "Tu trimestre de un vistazo",
    month: "Tu mes de un vistazo",
    year: "Tu año de un vistazo",
  },
  // "Julio a septiembre de 2026. Salieron $54,2M, pero no todo fue gasto."
  wentOut: "Salieron",
  // A year's sentence: "En 2026 salieron $54,2M, pero no todo fue gasto."
  inYear: "En",
  notAllSpending: "pero no todo fue gasto",
  nothingOut: "No salió plata de tu cuenta.",
  income: {
    label: "Ingresos",
    action: "Ver ingresos",
    // "El 85% llegó en 2 transferencias."
    cameIn: "llegó en",
    // "No incluye $2,8M que volvió de tus cuentas."
    excludes: "No incluye",
    cameBack: "que volvió de tus cuentas.",
    none: "No entró plata de otros en este periodo.",
  },
  spending: {
    label: "Gasto real",
    action: "Ver en qué gastaste",
    // "El 45% de lo que salió. Créditos, mercado, efectivo y pagos a personas."
    ofOut: "de lo que salió.",
    none: "No hubo gasto real en este periodo.",
  },
  moved: {
    label: "Movido",
    action: "Ver a dónde se movió",
    // "El 55% de lo que salió: a tu inversión y a tus tarjetas. Además volvieron $2,8M."
    ofOut: "de lo que salió:",
    also: "Además volvieron",
    cameBack: "Volvieron",
    none: "No moviste plata entre tus cuentas, tu inversión ni tus tarjetas.",
  },
  // "Tu cuenta": its balance, the bank's own figures, and its status.
  account: {
    title: "Tu cuenta",
    subtitle: "Comparamos cada saldo con el de tu banco.",
    // "Saldo al 30 de septiembre".
    balanceOn: "Saldo al",
    averageBalance: {
      quarter: "Saldo promedio",
      month: "Saldo promedio del trimestre",
    },
    interest: {
      quarter: "Intereses pagados",
      month: "Intereses del trimestre",
    },
    // A year's, added up from its quarterly statements (10.2c): "Intereses
    // del año", or "Intereses de 3 trimestres" without the four.
    interestOfYear: "Intereses del año",
    interestOf: "Intereses de",
    quarters: { one: "trimestre", other: "trimestres" },
    verified: "Saldo verificado",
    // "312 movimientos cuadran", "Encadenado con abr–jun 2026 · 312 cuadran".
    movements: { one: "movimiento", other: "movimientos" },
    reconcile: { one: "cuadra", other: "cuadran" },
    chainedTo: "Encadenado con",
    // "No cuadra por $810".
    doesNotReconcile: "No cuadra",
    by: "por",
    checkFile: "Revisa el archivo",
    breaks: "Ver dónde no cuadra",
    noBalance: "Sin saldo para verificar",
    movementsFile: "Archivo de movimientos",
  },
  // "Tu saldo y tu gasto real, día a día": both lines, and the day that
  // stands out.
  chart: {
    title: "Tu saldo y tu gasto real, día a día",
    spendingTitle: "Tu gasto real, día a día",
    guide: "Si la línea naranja sube rápido, estás gastando rápido.",
    noBalance: "Tus archivos de movimientos no traen saldo.",
    balance: "Saldo de la cuenta",
    spending: "Gasto real acumulado",
    // "4 de agosto: entraron $31,5M".
    cameIn: "entraron",
    // "Ese mismo día $22,0M pasaron a tu inversión. No fue gasto."
    sameDay: "Ese mismo día",
    movedTo: "pasaron",
    notSpending: "No fue gasto.",
    mostIncome: {
      quarter: "Fue el día con más ingresos del trimestre.",
      month: "Fue el día con más ingresos del mes.",
      year: "Fue el día con más ingresos del año.",
    },
    // "Tu saldo pasó de $13,8M el 30 de junio a $6,5M el 30 de septiembre,
    // y tu gasto real llegó a $24,4M."
    balanceFrom: "Tu saldo pasó de",
    on: "el",
    to: "a",
    andSpending: "y tu gasto real llegó a",
    // "Tu gasto real llegó a $1,5M el 7 de agosto."
    spendingReached: "Tu gasto real llegó a",
  },
  // "Dónde se fue más": the categories that weigh most in real spending,
  // and what needs a look.
  where: {
    title: "Dónde se fue más",
    subtitle: "Lo que más pesa en tu gasto real.",
    // "Costos del banco · revisar".
    check: "revisar",
    // "19% de tu gasto real.", "Menos del 1% de tu gasto real."
    ofSpending: "de tu gasto real.",
    lessThan: "Menos del",
    // "1 cuota, entre el 1 y el 4 de cada mes.", "2 pagos fijos, el día 5 de cada mes."
    installments: { one: "cuota", other: "cuotas" },
    fixed: { one: "pago fijo", other: "pagos fijos" },
    onDay: "el día",
    between: "entre el",
    andThe: "y el",
    eachMonth: "de cada mes",
    // "58 pagos por Nequi, QR y transferencia."
    payments: { one: "pago", other: "pagos" },
    by: "por",
  },
  // "Tu extracto, traducido": the period's main lines and what they mean.
  translated: {
    title: "Tu extracto, traducido",
    subtitle: "Lo que dice el banco y lo que significa.",
    filtersLabel: "Qué líneas ver",
    filters: {
      all: "Todo",
      spending: "Gasto",
      moved: "Movido",
      income: "Ingresos",
      review: "Por revisar",
    },
    empty: "No hubo movimientos de este tipo en el periodo.",
    // "Ver los 312 movimientos".
    seeAll: "Ver los",
    seeOne: "Ver el movimiento",
    // "Creemos que es tu inversión. Confírmalo en la revisión."
    weThink: "Creemos que es",
    confirm: "Confírmalo en la revisión.",
    // "Se repite entre el 1 y el 4 de cada mes."
    repeats: "Se repite",
    card: "Ese gasto está en el extracto de la tarjeta. Aquí no lo contamos dos veces.",
    toInvestment: "No es gasto: pasó a tu inversión.",
    toOwnAccount: "No es gasto: pasó a otra cuenta tuya.",
    cameBack: "No es ingreso: es tu propia plata que regresó.",
    // "Con el del 30 de julio suman $39,8M.", "Con otros 3 suman $4,2M."
    withThe: "Con el del",
    withOthers: "Con otros",
    addUpTo: "suman",
    countsAs: {
      spending: "Cuenta como gasto real.",
      income: "Cuenta como ingreso.",
      internal: "No es gasto ni ingreso: solo se movió.",
    },
    unknown: "Aún no sabemos qué es: no cuenta en tus totales.",
  },
  // "El 85%".
  the: "El",
  // Income of a kind without a noun of its own.
  anyIncome: { one: "ingreso", other: "ingresos" },
} as const;

/** How the income of each kind is counted: "2 transferencias". */
export const INCOME_NOUNS: Partial<Record<CategoryId, Noun>> = {
  income_transfer: { one: "transferencia", other: "transferencias" },
  interest: { one: "abono de intereses", other: "abonos de intereses" },
  deposit: { one: "consignación", other: "consignaciones" },
  refund: { one: "devolución", other: "devoluciones" },
  other_income: { one: "ingreso sin detalle", other: "ingresos sin detalle" },
};

/** What a guess to review is, in running text: "tu inversión". */
export const GUESSED_AS: Partial<Record<CategoryId, string>> = {
  investment: "tu inversión",
  own_account_transfer: "plata tuya",
  credit_card_payment: "el pago de tu tarjeta",
  loan_payment: "la cuota de un crédito",
  transfers_to_people: "un pago a otra persona",
  other_spending: "un gasto",
  other_income: "un ingreso",
};

/** Where money that only moved went: "a tu inversión". */
export const MOVED_TO: Partial<Record<CategoryId, string>> = {
  investment: "a tu inversión",
  credit_card_payment: "a tus tarjetas",
  own_account_transfer: "a tus cuentas",
};
