// Invented Bancolombia credit card statements in Excel (Appendix A.4), for
// generate-fixtures.mjs: a sheet in pesos and one in dollars, as the bank's
// "Extracto Mastercard Detallado" lays them out, from card-fixture-data.mjs.
// The summaries are computed from the movements, so every statement
// reconciles but card-broken. Names, numbers and amounts are invented.
import {
  CARD,
  CLIENT,
  CLIENT_HEADER,
  CREDIT_LIMIT,
  DUE_DATE,
  EARLIER,
  IN_DOLLARS,
  MINIMUM_LABELS,
  MOVEMENTS_HEADER,
  PERIOD,
  RATES,
  SEPTEMBER,
  SUMMARIES_HEADER,
  TOTAL_LABELS,
} from "./card-fixture-data.mjs";

const sum = (amounts) => amounts.reduce((total, amount) => total + amount, 0);
const roundUp = (cents) => Math.ceil(cents / 100) * 100;
const grouped = (digits, separator) =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
const cents = (amount) => String(Math.abs(amount) % 100).padStart(2, "0");

// "1.234.567,89" as most of the sheet writes amounts, a minus before them.
const comma = (amount) => {
  const sign = amount < 0 ? "-" : "";
  const pesos = grouped(String(Math.trunc(Math.abs(amount) / 100)), ".");
  return `${sign}${pesos},${cents(amount)}`;
};
// "123,456.00" as the sheet writes the minimum.
const point = (amount) =>
  `${grouped(String(Math.trunc(amount / 100)), ",")}.${cents(amount)}`;
// "1.234.567,8" as the sheet writes its charges: without a trailing zero.
const trimmed = (amount) => comma(amount).replace(/0$/, "").replace(/,$/, "");

const ofKind = (movements, ...kinds) =>
  movements.filter(([, , , kind]) => kinds.includes(kind));
const installmentPart = (movements, part) =>
  sum(movements.map(([, , , , , installment]) => installment?.[part] ?? 0));

// The month's charges and payments, as the total's summary counts them.
const chargesOf = (period) => {
  const charge = (kind) =>
    sum(ofKind(period, kind).map(([, , amount]) => amount));
  return {
    purchases: charge("purchase"),
    late: charge("late"),
    interest: charge("interest"),
    advances: charge("advance"),
    other: charge("other"),
    payments: -charge("payment"),
  };
};

// The summaries the movements give, as Appendix A.4's sums say.
const figuresOf = (period, earlier) => {
  const { purchases, late, interest, advances, other, payments } =
    chargesOf(period);
  const minimum = [
    installmentPart(ofKind(period, "purchase"), 2),
    installmentPart(earlier, 2),
    installmentPart(ofKind(period, "advance"), 2),
    late,
    interest,
    other,
  ];
  const due = sum(minimum);
  const debt = installmentPart([...period, ...earlier], 4) + due;
  const charges = debt + payments;
  const previous = charges - (purchases + late + interest + advances + other);
  return {
    total: [previous, purchases, late, interest, advances, other],
    charges,
    payments,
    minimum,
    minimumPayment: roundUp(due),
    totalPayment: roundUp(debt),
    available: CREDIT_LIMIT - debt,
  };
};

const movementRow = ([date, text, amount, , authorization, installment]) => [
  authorization ?? null,
  date,
  text,
  comma(amount),
  installment ? `${installment[0]}/${installment[1]}` : null,
  comma(installment?.[2] ?? amount),
  installment?.[3] ?? null,
  null,
  comma(installment?.[4] ?? 0),
];

const table = (label, movements) =>
  movements.length === 0
    ? [[label]]
    : [[label], MOVEMENTS_HEADER, ...movements.map(movementRow)];

const header = (currency, due, figures) => [
  ["Información Cliente:"],
  CLIENT_HEADER,
  CLIENT,
  [],
  ["Información de la Tarjeta", CARD],
  ["Moneda: ", currency],
  [],
  ["Periodo facturado: ", ...PERIOD],
  ["Pagar antes de: ", due],
  ["Pago mínimo", point(figures.minimumPayment)],
  ["Pago total", comma(figures.totalPayment)],
  ["Cupo total: ", comma(CREDIT_LIMIT)],
  ["Cupo disponible: ", comma(figures.available)],
  [],
  [],
];

// The rates beside both summaries, a line of each per row.
const summaries = ({ total, charges, payments, minimum }) => {
  const totals = [
    ...total.map(comma),
    trimmed(charges),
    comma(payments),
    comma(0),
    comma(payments),
  ];
  const minimums = [...minimum.map(comma), comma(0), comma(0)];
  return [
    SUMMARIES_HEADER,
    [],
    ...TOTAL_LABELS.map((label, line) => [
      ...(RATES[line] ?? [null, null, null]),
      label,
      totals[line],
      ...(MINIMUM_LABELS[line] ? [MINIMUM_LABELS[line], minimums[line]] : []),
    ]),
    [],
    [],
  ];
};

const pesosSheet = ({ period, earlier, misprint }) => {
  const figures = figuresOf(period, earlier);
  return [
    ...header("PESOS", DUE_DATE, figures),
    ...summaries(figures),
    ...table("Movimientos durante el periodo", misprint?.(period) ?? period),
    [],
    ...table("Movimientos antes del periodo", earlier),
  ];
};

// A sheet in dollars: nothing due, its summaries in zeros, and its movements.
const dollarsSheet = (movements) => {
  const zeros = figuresOf([], []);
  return [
    ...header("DOLARES", "-", { ...zeros, available: 0 }),
    ...summaries(zeros),
    ...table("Movimientos durante el periodo", movements),
  ];
};

// As the extraction returns rows: without their empty cells at the end.
const withoutTrailingNulls = (row) =>
  row.slice(0, row.findLastIndex((cell) => cell !== null) + 1);

const book = (pesos, dollars) => [
  { name: "PESOS", rows: pesos.map(withoutTrailingNulls) },
  { name: "DOLARES", rows: dollars.map(withoutTrailingNulls) },
];

// The payment read as $10.000 less than the summary counts.
const misprintPayment = (movements) =>
  movements.map(([date, text, amount, kind, ...rest]) =>
    kind === "payment"
      ? [date, text, amount + 1_000_000, kind, ...rest]
      : [date, text, amount, kind, ...rest],
  );

/** Each card fixture's sheets, by name. */
export const cardFixtures = () => ({
  "card-basic": book(
    pesosSheet({ period: SEPTEMBER, earlier: EARLIER }),
    dollarsSheet([]),
  ),
  "card-dollars": book(
    pesosSheet({ period: SEPTEMBER, earlier: EARLIER }),
    dollarsSheet(IN_DOLLARS),
  ),
  "card-broken": book(
    pesosSheet({
      period: SEPTEMBER,
      earlier: EARLIER,
      misprint: misprintPayment,
    }),
    dollarsSheet([]),
  ),
});
