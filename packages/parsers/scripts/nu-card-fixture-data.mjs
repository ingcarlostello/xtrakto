// The invented data of nu-card-fixtures.mjs: a Nu card, its holder and two
// months of its movements (Appendix A.5). Names, numbers and amounts are
// invented.

export const HOLDER = {
  greeting: "Hola, Ana Maria",
  name: "Ana Maria Prueba Gomez",
  id: "CC 1020304050",
  address: "Calle 10 # 20-30, apto 101, Medellín",
};
export const CARDS = { physical: "1234", virtual: "5678" };
export const CREDIT_LIMIT = 500_000_000;

// Each row, newest first, as Nu lists it: its date over one or two lines, its
// description over two, and for a purchase its value in cents, its
// installment of its count, its monthly rate and what that rate charges, and
// what remains; under it, a conversion charge or late interest. A payment
// has its value, its parts to the minimum and to the total, and the parts it
// paid, marked "↪" or "•".
export const SEPTEMBER = {
  month: "Septiembre",
  period: ["12 AGO", "10 SEP 2026"],
  cut: "11 SEP 2026",
  due: ["04 OCT 2026", "4 OCTUBRE 2026"],
  rows: [
    {
      date: ["08 SEP", "2026"],
      text: ["Supermercado", "Central"],
      purchase: [8_540_000, [1, 1], "0.00%", 0, 0],
    },
    {
      date: ["05 SEP", "2026"],
      text: ["Gracias por tu", "pago"],
      payment: {
        value: 50_000_000,
        toMinimum: 30_000_000,
        toTotal: 20_000_000,
        mark: "↪",
        parts: [
          ["A capital", 48_000_000],
          ["A intereses", 1_500_000],
          ["A cargos y comisiones", 500_000],
        ],
      },
    },
    {
      date: ["28 AGO", "2026"],
      text: ["App de", "Musica"],
      purchase: [3_290_000, [1, 1], "0.00%", 0, 0],
      conversion: 98_700,
    },
    {
      date: ["20 AGO", "2026"],
      text: ["Pedido", "123456789"],
      purchase: [120_000_000, [1, 24], "2.05%", 2_460_000, 115_000_000],
    },
    {
      date: ["15 JUL", "2026"],
      text: ["Almacen", "Ropa"],
      purchase: [60_000_000, [2, 6], "2.05%", 1_025_000, 40_000_000],
    },
  ],
};

// The next month: a date on one line, the September purchases listed again
// with their next installment, late interest under one, and a payment whose
// parts are marked "•" and whose part to the total isn't printed. Its
// minimum is printed on a page of its own.
export const OCTOBER = {
  month: "Octubre",
  period: ["11 SEP", "10 OCT 2026"],
  cut: "11 OCT 2026",
  due: ["04 NOV 2026", "4 NOVIEMBRE 2026"],
  rows: [
    {
      date: ["02 OCT 2026"],
      text: ["Restaurante El", "Patio"],
      purchase: [9_000_000, [1, 1], "0.00%", 0, 0],
    },
    {
      date: ["28 SEP", "2026"],
      text: ["Gracias por tu", "pago"],
      payment: {
        value: 50_000_000,
        toMinimum: 25_000_000,
        toTotal: 25_000_000,
        mark: "•",
        hidesTotal: true,
        parts: [
          ["A capital", 48_000_000],
          ["A intereses", 1_800_000],
          ["A cargos y comisiones", 200_000],
        ],
      },
    },
    {
      date: ["20 AGO", "2026"],
      text: ["Pedido", "123456789"],
      purchase: [120_000_000, [2, 24], "2.05%", 2_357_500, 110_000_000],
    },
    {
      date: ["15 JUL", "2026"],
      text: ["Almacen", "Ropa"],
      purchase: [60_000_000, [3, 6], "2.05%", 820_000, 30_000_000],
      late: ["2.85%", 125_000],
    },
  ],
  minimumOnItsOwnPage: true,
};
