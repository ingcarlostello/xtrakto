import type { CategoryId } from "@xtrakto/core";
import type { Noun } from "@/utils/count-text.utils";

// The summary (docs/ui/v8-01): an account's period at a glance.
export const SUMMARY_COPY = {
  title: "Resumen de tu cuenta de ahorros",
  upload: "Subir extracto",
  glanceTitle: {
    quarter: "Tu trimestre de un vistazo",
    month: "Tu mes de un vistazo",
  },
  // "Julio a septiembre de 2026. Salieron $54,2M, pero no todo fue gasto."
  to: "a",
  of: "de",
  wentOut: "Salieron",
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
  // "El 85%".
  the: "El",
  and: "y",
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

/** Where money that only moved went: "a tu inversión". */
export const MOVED_TO: Partial<Record<CategoryId, string>> = {
  investment: "a tu inversión",
  credit_card_payment: "a tus tarjetas",
  own_account_transfer: "a tus cuentas",
};
