// Invented statement data for generate-fixtures.mjs: no real names, numbers
// or amounts. Movements are [date, description, amount in cents, extra]; the
// quarterly statement reads `extra.branch` (its SUCURSAL column) and the
// movements export reads `extra.reference`.

export const INTEREST = "ABONO INTERESES AHORROS";

export const HOLDER = [
  "ANA MARIA PRUEBA GOMEZ",
  "calle falsa #12-34 apto 101",
  "MEDELLIN (ANTIOQUIA)  ANTI",
];

export const ACCOUNT = ["CUENTA DE AHORROS", "12345678901", "SUCURSAL CENTRO"];

// A quarter with interest on a few days only, to keep it short. It has
// mixed-case names and PSE entities, double spaces, transfers to the holder's
// own account with the name cut (also as first name and first surname),
// investment interest, and interest of less than one peso.
export const BASIC_MOVEMENTS = [
  ["2026-07-01", INTEREST, 289],
  [
    "2026-07-01",
    "TRANSFERENCIAS A NEQUI",
    -2_000_000,
    { reference: "3001234567" },
  ],
  [
    "2026-07-01",
    "PAGO PSE Banco Ejemplo S",
    -35_000_000,
    { reference: "612345678" },
  ],
  [
    "2026-07-02",
    "CONSIGNACION CORRESPONSAL CB",
    15_000_000,
    { branch: "CANAL CORRESPONSA" },
  ],
  ["2026-07-02", INTEREST, 271],
  ["2026-07-03", "COMPRA EN  TIENDA LA ESQUI", -4_590_000],
  ["2026-07-03", "TRANSF A Ana Maria Pru", -20_000_000],
  ["2026-07-04", INTEREST, 85],
  ["2026-07-10", "PAGO INTERBANC EMPRESA EJEMPLO", 320_000_000],
  ["2026-07-10", "PAGO SUC VIRT TC VISA PESOS", -125_000_000],
  ["2026-07-15", "IMPTO GOBIERNO 4X1000", -480_000],
  [
    "2026-07-20",
    "RETIRO CAJERO  ATM PLAZA CENTR",
    -30_000_000,
    { reference: "ATM PLAZA CENTRAL 1" },
  ],
  [
    "2026-07-28",
    "PAGO QR CAFE DEL PARQUE",
    -1_850_000,
    { reference: "0077001234" },
  ],
  ["2026-07-31", INTEREST, 312],
  [
    "2026-08-01",
    "PAGO PSE EMPRESA DE ENERGIA",
    -18_543_000,
    { reference: "445566778" },
  ],
  ["2026-08-05", "TRANSF DE JUAN PEREZ", 50_000_000],
  ["2026-08-08", "TRANSF DE ANA PRUEBA", 45_000_000],
  ["2026-08-10", "PAGO INTERBANC EMPRESA EJEMPLO", 320_000_000],
  ["2026-08-10", "APERTURA INV VIRTUAL SVP", -100_000_000],
  [
    "2026-08-12",
    "PAGO LLAVE Maria Lopez",
    -6_000_000,
    { reference: "0099887766" },
  ],
  ["2026-08-18", "COMPRA EN  MERCADO XYZ", -23_015_000],
  ["2026-08-20", "TRANSF A PEDRO GOMEZ R", -8_000_000],
  [
    "2026-08-25",
    "TRANSFERENCIAS A NEQUI",
    -10_000_000,
    { reference: "3109876543" },
  ],
  ["2026-08-31", INTEREST, 405],
  [
    "2026-09-02",
    "RETIRO CORRESPONSAL CB",
    -20_000_000,
    { branch: "CANAL CORRESPONSA" },
  ],
  [
    "2026-09-04",
    "INTERES INV VIRT 10000000001",
    1_950_000,
    { branch: "VIRTUAL" },
  ],
  ["2026-09-05", "TRANSF A ANA MARIA PRUEB", -10_000_000],
  ["2026-09-10", "PAGO INTERBANC EMPRESA EJEMPLO", 320_000_000],
  ["2026-09-10", "PAGO SUC VIRT TC VISA PESOS", -98_000_000],
  ["2026-09-15", "IMPTO GOBIERNO 4X1000", -892_000],
  [
    "2026-09-22",
    "TRANSFERENCIA CTA SUC VIRTUAL",
    -15_000_000,
    { reference: "01234567890" },
  ],
  ["2026-09-29", "COMPRA EN  TIENDA LA ESQUI", -6_730_000],
  ["2026-09-30", INTEREST, 520],
];

// From the period's first day, the last of 2026, into 2027.
export const ROLLOVER_MOVEMENTS = [
  ["2026-12-31", INTEREST, 98],
  ["2027-01-01", INTEREST, 95],
  ["2027-01-02", "PAGO PSE EMPRESA DE ENERGIA", -15_000_000],
  ["2027-01-10", "PAGO INTERBANC EMPRESA EJEMPLO", 320_000_000],
  ["2027-02-14", "PAGO QR CAFE DEL PARQUE", -2_200_000],
  ["2027-02-28", INTEREST, 410],
  ["2027-03-31", INTEREST, 432],
];

// A week, dated like the quarterly statement: generate-fixtures.mjs moves the
// interest rows to the dates the movements export shows.
export const OCTOBER_MOVEMENTS = [
  ["2026-10-01", INTEREST, 487],
  [
    "2026-10-01",
    "TRANSFERENCIAS A NEQUI",
    -5_000_000,
    { reference: "3001234567" },
  ],
  ["2026-10-02", INTEREST, 491],
  [
    "2026-10-02",
    "PAGO QR CAFE DEL PARQUE",
    -1_200_000,
    { reference: "0077001234" },
  ],
  ["2026-10-02", "PAGO QR TIENDA SIN CODIGO", -850_000],
  ["2026-10-03", INTEREST, 488],
  [
    "2026-10-03",
    "RETIRO CAJERO  ATM PLAZA CENTR",
    -20_000_000,
    { reference: "ATM PLAZA CENTRAL 1" },
  ],
  ["2026-10-04", INTEREST, 93],
  ["2026-10-05", INTEREST, 476],
  [
    "2026-10-05",
    "PAGO PSE EMPRESA DE ENERGIA",
    -18_543_000,
    { reference: "445566778" },
  ],
  [
    "2026-10-05",
    "TRANSFERENCIAS A NEQUI",
    -2_500_000,
    { reference: "3109876543" },
  ],
  ["2026-10-06", INTEREST, 470],
  [
    "2026-10-06",
    "PAGO LLAVE Maria Lopez",
    -6_000_000,
    { reference: "0099887766" },
  ],
  [
    "2026-10-06",
    "TRANSF A EMPRESA DE GAS DE CO",
    -2_334_000,
    { reference: "123456 1234567890 12345" },
  ],
  ["2026-10-07", INTEREST, 512],
  ["2026-10-07", "PAGO INTERBANC EMPRESA EJEMPLO", 320_000_000],
  ["2026-10-07", "COMPRA EN  MERCADO XYZ", -8_425_050],
];

// quarterly-large picks its random movements from these:
// [description, smallest and largest amount in pesos, extra].
export const LARGE_TEMPLATES = [
  ["COMPRA EN  MERCADO XYZ", -300_000, -20_000],
  ["PAGO QR CAFE DEL PARQUE", -40_000, -5_000],
  ["TRANSFERENCIAS A NEQUI", -200_000, -10_000],
  ["PAGO PSE Banco Ejemplo S", -800_000, -100_000],
  ["RETIRO CAJERO  ATM PLAZA CENTR", -500_000, -50_000],
  ["PAGO LLAVE Maria Lopez", -150_000, -20_000],
  ["TRANSF DE JUAN PEREZ", 50_000, 600_000],
  [
    "CONSIGNACION CORRESPONSAL CB",
    100_000,
    1_000_000,
    { branch: "CANAL CORRESPONSA" },
  ],
  ["IMPTO GOBIERNO 4X1000", -9_000, -1_000],
];
