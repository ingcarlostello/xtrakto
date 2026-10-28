// The example's quarterly statement (7.8): invented, July to September 2026,
// with what every screen shows. Fixed payments each month (a loan in two
// installments, energy that rises, internet, a gym, gas paid by transfer once
// and by PSE after, water, a phone plan, Netflix, savings by key, a card that
// varies a lot), the 4x1000, the holder's own name whole and cut, and the
// groups the quick review asks about. Amounts in cents; each day in the
// bank's order.

const INTEREST = "ABONO INTERESES AHORROS";

/** As the statement prints the holder; never a real person. */
export const EXAMPLE_HOLDER = "ANA MARIA PRUEBA GOMEZ";
export const EXAMPLE_ACCOUNT_LAST4 = "8821";
export const EXAMPLE_PERIOD = { from: "2026-06-30", to: "2026-09-30" } as const;
export const EXAMPLE_OPENING_BALANCE = 650_000_000;

/** [date, the bank's text, amount in cents] */
export type ExampleMovement = readonly [string, string, number];

// The payments that repeat each month, as design v8-04 shows them.
const fixedPayments = (
  month: string,
  { energy, card }: { energy: number; card: number },
): ExampleMovement[] => [
  [`2026-${month}-02`, "PAGO PSE Financiera Andes S", -154_000_000],
  [`2026-${month}-03`, "PAGO PSE EMPRESA DE ENERGIA", energy],
  [`2026-${month}-04`, "PAGO PSE Financiera Andes S", -31_100_000],
  [`2026-${month}-04`, "PAGO LLAVE AHORRO DOLAR", -50_000_000],
  [`2026-${month}-05`, "PAGO PSE HOGAR CONECTADO SA", -12_990_000],
  [`2026-${month}-06`, "PAGO SUC VIRT TC MASTER PESOS", card],
  [`2026-${month}-10`, "PAGO INTERBANC EMPRESA EJEMPLO", 420_000_000],
  [`2026-${month}-10`, "COMPRA EN  GIMNASIO FIT", -11_000_000],
  [
    `2026-${month}-11`,
    month === "07"
      ? "TRANSF A GAS NATURAL CIUDAD"
      : "PAGO PSE GAS NATURAL CIUDAD",
    -3_099_000,
  ],
  [`2026-${month}-14`, "COMPRA EN  NETFLIX.COM", -3_890_000],
  [`2026-${month}-19`, "PAGO PSE Acueducto Municipa", -9_400_000],
  [`2026-${month}-22`, "PAGO QR Telefonia Movil", -6_200_000],
];

const JULY: ExampleMovement[] = [
  ["2026-07-01", INTEREST, 289],
  ["2026-07-02", "CONSIGNACION CORRESPONSAL CB", 15_000_000],
  ["2026-07-08", "COMPRA EN  UBER RIDES", -1_850_000],
  ["2026-07-12", "PAGO QR CAFE DEL PARQUE", -1_850_000],
  ["2026-07-15", "IMPTO GOBIERNO 4X1000", -480_000],
  ["2026-07-17", "TRANSF A Ana Maria Pru", -20_000_000],
  ["2026-07-18", "COMPRA EN  SUPERMERCADO VECI", -18_450_000],
  ["2026-07-20", "RETIRO CAJERO  ATM PLAZA CENTR", -30_000_000],
  ["2026-07-25", "COMPRA EN  DROGUERIA ALEMANA", -4_320_000],
  ["2026-07-28", "PAGO PSE Banco Ejemplo S", -35_000_000],
  ["2026-07-31", INTEREST, 312],
];

const AUGUST: ExampleMovement[] = [
  ["2026-08-05", "TRANSF DE JUAN PEREZ", 50_000_000],
  ["2026-08-08", "TRANSF DE ANA PRUEBA", 45_000_000],
  ["2026-08-10", "APERTURA INV VIRTUAL SVP", -100_000_000],
  ["2026-08-12", "PAGO LLAVE Maria Lopez", -6_000_000],
  ["2026-08-15", "IMPTO GOBIERNO 4X1000", -720_000],
  ["2026-08-16", "COMPRA EN  BOLD TIENDA ROPA", -8_900_000],
  ["2026-08-18", "COMPRA EN  SUPERMERCADO VECI", -21_300_000],
  ["2026-08-20", "TRANSF A PEDRO GOMEZ R", -8_000_000],
  ["2026-08-23", "COMPRA EN  CINE COLOMBIA", -3_600_000],
  ["2026-08-26", "PAGO QR RESTAURANTE EL FOGON", -9_400_000],
  ["2026-08-29", "COMPRA EN  UBER RIDES", -2_100_000],
  ["2026-08-31", INTEREST, 405],
];

const SEPTEMBER: ExampleMovement[] = [
  ["2026-09-02", "RETIRO CORRESPONSAL CB", -20_000_000],
  ["2026-09-04", "INTERES INV VIRT *******0001", 1_950_000],
  ["2026-09-05", "TRANSF A ANA MARIA PRUEB", -10_000_000],
  ["2026-09-07", "TRANSFERENCIA DESDE NEQUI", 8_000_000],
  ["2026-09-09", "PAGO PSE NU Compania de Fina", -60_000_000],
  ["2026-09-15", "IMPTO GOBIERNO 4X1000", -892_000],
  ["2026-09-18", "COMPRA EN  SUPERMERCADO VECI", -19_870_000],
  ["2026-09-21", "0", -1_200_000],
  ["2026-09-22", "TRANSFERENCIA CTA SUC VIRTUAL", -15_000_000],
  ["2026-09-24", "COMPRA EN  AMAZON MKTPLACE", -12_500_000],
  ["2026-09-27", "PAGO QR PANADERIA LA ESPIGA", -1_640_000],
  ["2026-09-30", INTEREST, 520],
];

// By date; a stable sort keeps each day's order.
const byDate = ([a]: ExampleMovement, [b]: ExampleMovement) =>
  a < b ? -1 : a > b ? 1 : 0;

export const EXAMPLE_MOVEMENTS: readonly ExampleMovement[] = [
  ...fixedPayments("07", { energy: -15_000_000, card: -48_000_000 }),
  ...JULY,
  ...fixedPayments("08", { energy: -15_400_000, card: -120_000_000 }),
  ...AUGUST,
  ...fixedPayments("09", { energy: -16_800_000, card: -150_000_000 }),
  ...SEPTEMBER,
].sort(byDate);

/** The interest rows, which the statement's summary adds up. */
export const EXAMPLE_INTEREST_TEXT = INTEREST;
