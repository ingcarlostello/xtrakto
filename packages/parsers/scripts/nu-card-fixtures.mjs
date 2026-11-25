// Invented Nu credit card statements in PDF (Appendix A.5), for
// generate-fixtures.mjs, laid out by nu-card-pdf-layout.mjs from
// nu-card-fixture-data.mjs. The summary is computed from the movements, so
// every statement reconciles but nu-card-broken. Names, numbers and amounts
// are invented.
import {
  CARDS,
  CREDIT_LIMIT,
  HOLDER,
  OCTOBER,
  SEPTEMBER,
} from "./nu-card-fixture-data.mjs";
import { nuCardPdfPages } from "./nu-card-pdf-layout.mjs";

const sum = (values) => values.reduce((total, value) => total + value, 0);
const grouped = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
// "$1.234.567,89" as Nu writes amounts, and "+ $" or "- $" in its summary.
const pesos = (cents) =>
  `$${grouped(String(Math.trunc(cents / 100)))},${String(cents % 100).padStart(2, "0")}`;
const signed = (sign, cents) => `${sign} ${pesos(cents)}`;

const monthlyOf = ([value, [, count]]) => Math.round(value / count);

// The month's figures as its summary adds them up (Appendix A.5): what's due
// with its late interest, the minimum and the total.
const figuresOf = ({ rows }) => {
  const purchases = rows.filter((row) => row.purchase !== undefined);
  const payments = rows.map((row) => row.payment).filter(Boolean);
  const late = sum(rows.map((row) => row.late?.[1] ?? 0));
  const due = sum(purchases.map((row) => monthlyOf(row.purchase))) + late;
  const interest = sum(purchases.map((row) => row.purchase[3]));
  const conversion = sum(rows.map((row) => row.conversion ?? 0));
  const toMinimum = sum(payments.map((payment) => payment.toMinimum));
  const toTotal = sum(payments.map((payment) => payment.toTotal));
  const remaining = sum(purchases.map((row) => row.purchase[4]));
  const minimum = due + interest + conversion - toMinimum;
  return {
    late,
    due,
    interest,
    conversion,
    toMinimum,
    toTotal,
    remaining,
    minimum,
    total: minimum + remaining - toTotal,
    paid: sum(payments.map((payment) => payment.value)),
  };
};

// The summary's lines, late interest only when charged.
const ledgerOf = (figures, totalLabel) => [
  ["Deuda a pagar este mes", pesos(figures.due)],
  ...(figures.late > 0 ? [["Intereses de mora", pesos(figures.late)]] : []),
  ["Intereses", signed("+", figures.interest)],
  ["Comisiones de avances", signed("+", 0)],
  ["Comisiones por servicio", signed("+", 0)],
  ["Cargos por conversión", signed("+", figures.conversion)],
  ["Abonos", signed("-", figures.toMinimum)],
  ["Devoluciones o ajustes a favor", signed("-", 0)],
  ["PAGO MÍNIMO", pesos(figures.minimum)],
  ["Abonos", signed("-", figures.toTotal)],
  ["Deuda restante", signed("+", figures.remaining)],
  [`PAGO HASTA EL ${totalLabel}`, pesos(figures.total)],
];

// A payment's row: its value, its parts to the minimum and to the total, and
// the parts it paid under it.
const paymentRow = (row) => {
  const { value, toMinimum, toTotal, mark, parts, hidesTotal } = row.payment;
  return {
    ...row,
    tall: true,
    cells: [row.date[0], row.text[0], pesos(value), null, null, null]
      .concat(`-${pesos(toMinimum)}`)
      .concat(hidesTotal ? null : `-${pesos(toTotal)}`),
    subRows: parts.map(([label, cents], index) => [
      `${mark} ${label} ${pesos(cents)}`,
      6.5 + 5.9 * index,
      5,
    ]),
  };
};

// A purchase's row, with the conversion charge or the late interest under it.
const purchaseRow = (row, conversionShift) => {
  const [value, [number, count], rate, interest, remaining] = row.purchase;
  const monthly = monthlyOf(row.purchase);
  return {
    ...row,
    tall: row.late !== undefined,
    cells: [
      row.date[0],
      row.text[0],
      pesos(value),
      `${number} de ${count}`,
      pesos(monthly),
      [rate, pesos(interest)],
      pesos(monthly + interest),
      pesos(remaining),
    ],
    subRows:
      row.conversion === undefined
        ? []
        : [
            [
              "↪ Comisión por cambio de moneda",
              12.5,
              6,
              pesos(row.conversion + conversionShift),
            ],
          ],
    late:
      row.late === undefined ? undefined : [row.late[0], pesos(row.late[1])],
  };
};

const statementOf = (month, conversionShift = 0) => {
  const figures = figuresOf(month);
  return {
    holder: HOLDER,
    cards: CARDS,
    month: month.month,
    due: month.due[0],
    cut: month.cut,
    period: month.period,
    limits: {
      limit: pesos(CREDIT_LIMIT),
      used: pesos(figures.total),
      available: pesos(CREDIT_LIMIT - figures.total),
      paid: pesos(figures.paid),
      toMinimum: pesos(figures.toMinimum),
      toTotal: pesos(figures.toTotal),
    },
    ledger: ledgerOf(figures, month.due[1]),
    minimum: pesos(figures.minimum),
    minimumOnItsOwnPage: month.minimumOnItsOwnPage === true,
    rows: month.rows.map((row) =>
      row.payment === undefined
        ? purchaseRow(row, conversionShift)
        : paymentRow(row),
    ),
  };
};

/** Each Nu card fixture's PDF pages, by name. */
export const nuCardPdfFixtures = () => ({
  "nu-card-basic-pdf": nuCardPdfPages(statementOf(SEPTEMBER)),
  "nu-card-late-pdf": nuCardPdfPages(statementOf(OCTOBER)),
  // Its conversion charge printed $10 over what the summary counts.
  "nu-card-broken-pdf": nuCardPdfPages(statementOf(SEPTEMBER, 1_000)),
});
