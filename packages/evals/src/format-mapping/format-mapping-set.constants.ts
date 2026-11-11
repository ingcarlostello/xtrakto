// The invented set the mapping proposal is measured on (11.2a). Banks,
// names, numbers and texts are invented; none is a real bank's layout.

/** The same invented files on every run. */
export const MAPPING_SET_SEED = 20_261_111;

/** Layouts the generator writes, besides the hard ones written by hand. */
export const GENERATED_LAYOUTS = 40;

/** How invented banks name each column, as most write them in Spanish. */
export const COLUMN_NAMES = {
  date: [
    "FECHA",
    "Fecha",
    "FECHA TRANS",
    "Fecha de la transacción",
    "Fecha movimiento",
    "FECHA OPERACION",
    "F. Transacción",
  ],
  description: [
    "DESCRIPCION",
    "Descripción",
    "DETALLE",
    "Concepto",
    "CONCEPTO",
    "Detalle del movimiento",
    "Transacción",
  ],
  amount: ["VALOR", "Valor", "Monto", "IMPORTE", "Valor transacción"],
  moneyOut: ["DEBITOS", "Débitos", "Débito", "Retiros", "SALIDAS", "Cargos"],
  moneyIn: [
    "CREDITOS",
    "Créditos",
    "Crédito",
    "Depósitos",
    "ENTRADAS",
    "Abonos",
  ],
  balance: ["SALDO", "Saldo", "Saldo disponible", "SALDO FINAL", "Nuevo saldo"],
  reference: ["REFERENCIA", "Referencia", "Ref.", "No. referencia"],
  direction: ["TIPO", "Tipo", "D/C", "Naturaleza"],
  secondDate: ["Fecha valor", "FECHA APLICACION", "Fecha de registro"],
  branch: ["OFICINA", "Sucursal", "Cod. oficina"],
} as const;

/** The words a direction column writes for money in and out. */
export const DIRECTION_WORDS = [
  { in: "C", out: "D" },
  { in: "CR", out: "DB" },
  { in: "Crédito", out: "Débito" },
  { in: "+", out: "-" },
  { in: "ABONO", out: "CARGO" },
] as const;

/** What an invented movement says, money going out. */
export const SPENDING_TEXTS = [
  "COMPRA POS SUPERMERCADO EL ARCO",
  "PAGO PSE EMPRESA DE ENERGIA",
  "RETIRO CAJERO CENTRO",
  "TRANSFERENCIA A TERCEROS",
  "PAGO TARJETA CREDITO",
  "COMPRA EN LINEA TIENDA VIRTUAL",
  "GMF 4X1000",
  "PAGO SERVICIO DE AGUA",
  "COMPRA DROGUERIA LA SALUD",
  "PAGO PLAN CELULAR",
] as const;

/** What an invented movement says, money coming in. */
export const INCOME_TEXTS = [
  "ABONO NOMINA EMPRESA ABC",
  "TRANSFERENCIA RECIBIDA",
  "INTERESES AHORRO",
  "DEVOLUCION COMPRA",
] as const;

/** Invented banks, for the title rows. */
export const BANK_NAMES = [
  "BANCO HORIZONTE",
  "Banco Cordillera",
  "COOPERATIVA ANDINA",
  "Banco del Río",
  "Billetera Colibrí",
  "Banco Altamar",
] as const;

/** The invented holder the title rows name. */
export const HOLDER_NAME = "ANA MARIA PRUEBA GOMEZ";

/** How a channel column names where a movement was made. */
export const CHANNELS = ["APP", "OFICINA", "CAJERO", "PSE"] as const;
