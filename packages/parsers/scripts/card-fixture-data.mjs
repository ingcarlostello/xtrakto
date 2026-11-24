// The invented data of card-fixtures.mjs: a card, its holder, a month of its
// movements and the labels Bancolombia's "Extracto Mastercard Detallado"
// prints (Appendix A.4). Names, numbers and amounts are invented.

export const CARD = "************1234";
export const CLIENT_HEADER = [
  "Cliente",
  null,
  "Dirección",
  "Ciudad",
  "Departamento",
];
export const CLIENT = [
  "ANA MARIA PRUEBA GOMEZ",
  null,
  "CALLE 10 # 20-30 APTO 101",
  "MEDELLIN (ANTIOQUIA)",
  "ANTIOQUIA",
];
export const PERIOD = ["31 ago", "30 sep. 2026"];
export const DUE_DATE = "oct. 15, 2026";
export const CREDIT_LIMIT = 500_000_000;

export const MOVEMENTS_HEADER = [
  "Número de autorización",
  "Fecha",
  "Movimientos",
  "Valor Movimiento",
  "Número de cuotas",
  "Valor cuota/abono",
  "Interés mensual (%)",
  "Interés anual (%)",
  "Saldo pendiente",
];

// [date, text, the bank's amount in cents (a charge positive), kind,
// authorization, installment as [number, count, monthly, rate, remaining]].
export const SEPTEMBER = [
  ["30/09/2026", "INTERESES DE MORA", 120_000, "late"],
  ["30/09/2026", "INTERESES CORRIENTES", 4_500_030, "interest"],
  ["30/09/2026", "CUOTA DE MANEJO", 3_290_000, "other"],
  ["15/09/2026", "ABONO SUCURSAL VIRTUAL", -50_000_000, "payment", "C01234"],
  [
    "10/09/2026",
    "AVANCE CAJERO CENTRO",
    20_000_000,
    "advance",
    "C04567",
    [1, 1, 20_000_000, "1,9000", 0],
  ],
  [
    "08/09/2026",
    "SUPERMERCADO EL ARCO",
    8_540_000,
    "purchase",
    "C07890",
    [1, 1, 8_540_000, "0,0000", 0],
  ],
  [
    "03/09/2026",
    "TIENDA EJEMPLO 123456789",
    12_000_000,
    "purchase",
    "C02468",
    [1, 12, 1_000_000, "1,9000", 11_000_000],
  ],
];

/** Purchases of earlier statements, whose installments go on. */
export const EARLIER = [
  [
    "20/07/2026",
    "ALMACEN HOGAR",
    60_000_000,
    "earlier",
    "C13579",
    [3, 6, 10_000_000, "1,9000", 30_000_000],
  ],
  [
    "10/03/2026",
    "COMPRA DE CARTERA Y/O D",
    300_000_000,
    "earlier",
    "000000",
    [7, 30, 10_000_000, "1,1500", 230_000_000],
  ],
];

/** Movements of the sheet in dollars, which a statement in pesos only counts. */
export const IN_DOLLARS = [
  [
    "21/09/2026",
    "APP DE MUSICA",
    1_299,
    "purchase",
    "C11111",
    [1, 1, 1_299, "1,9000", 0],
  ],
  [
    "12/09/2026",
    "LIBRERIA EN LINEA",
    4_550,
    "purchase",
    "C22222",
    [1, 1, 4_550, "1,9000", 0],
  ],
];

export const SUMMARIES_HEADER = [
  "Tasas de interés vigente",
  "Tasa Mes Vencido",
  "Tasa Efectivo Anual",
  "Resumen Saldo Total",
  null,
  "Resumen Pago Mínimo",
];
export const RATES = [
  ["Compra un mes", "0.0000 %", "0.0000 %"],
  ["Compra 2 - 36 meses", "1.9000 %", "25.3400 %"],
  ["Impuestos", "1.9000 %", "25.3400 %"],
  ["Avances", "1.9000 %", "25.3400 %"],
  ["Mora", "1.9000 %", "25.3400 %"],
];
export const TOTAL_LABELS = [
  "+ Saldo anterior",
  "+ Compras del mes",
  "+ Intereses de mora",
  "+ Intereses corrientes",
  "+ Avances",
  "+ Otros cargos",
  "Cargos",
  "(-) Pagos / abonos",
  "(-) Saldo a favor",
  "Abono",
];
export const MINIMUM_LABELS = [
  "Cuota transacciones",
  "Cuota Transacciones anteriores",
  "Cuota avances",
  "+ Intereses de mora",
  "+ Intereses corrientes",
  "Otros cargos",
  "(+) Saldo en mora",
  "(-) A favor",
];
