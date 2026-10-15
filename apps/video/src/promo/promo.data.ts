import {
  Activity,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Download,
  Landmark,
  ShoppingBag,
  ShoppingCart,
  Users,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Kind } from "../theme/tokens";

// Invented data, the same the v8 designs show (docs/ui): no real person,
// account, reference or amount. Bank lines keep the bank's own format.

/** The quarterly statement's lines, as the bank prints them. */
export const BANK_LINES = [
  { date: "1/07", text: "PAGO PSE Financiera Andes S", value: "-1,540,000.00" },
  { date: "3/07", text: "TRANSFERENCIAS A NEQUI", value: "-90,000.00" },
  {
    date: "8/07",
    text: "PAGO SUC VIRT TC MASTER PESOS",
    value: "-1,250,000.00",
  },
  { date: "8/07", text: "PAGO LLAVE INVERSIONES XY", value: "-2,000,000.00" },
  {
    date: "12/07",
    text: "RETIRO CAJERO ATM HALL CENTRO",
    value: "-200,000.00",
  },
  { date: "15/07", text: "PAGO PSE Electrificadora de", value: "-182,000.00" },
  { date: "16/07", text: "COMPRA EN  GIMNASIO FIT", value: "-110,000.00" },
  { date: "17/07", text: "ABONO INTERESES AHORROS", value: "14.20" },
] as const;

export const UPLOAD_STEPS = [
  {
    title: "Leído en tu navegador",
    detail: "El archivo no salió de tu equipo.",
  },
  {
    title: "Reconocido",
    detail: "Bancolombia · Extracto trimestral · jul–sep 2026",
  },
  { title: "Revisando duplicados", detail: "Ninguno estaba en tu cuenta." },
  {
    title: "Saldo verificado",
    detail: "Cada movimiento cuadra con su saldo, al centavo.",
  },
] as const;

type KindTotal = {
  kind: Kind;
  icon: LucideIcon;
  label: string;
  /** Tenths of a million: 468 is $46,8M. */
  tenths: number;
  /** Share of what went out, for real spending and moved. */
  percent?: number;
  detail: string;
};

// 24,4 + 29,8 = 54,2: what went out of the account in the quarter.
export const KIND_TOTALS: readonly KindTotal[] = [
  {
    kind: "income",
    icon: Download,
    label: "Ingresos",
    tenths: 468,
    detail: "Lo que entró de otros.",
  },
  {
    kind: "spending",
    icon: ShoppingCart,
    label: "Gasto real",
    tenths: 244,
    percent: 45,
    detail: "Compras, créditos, efectivo y pagos a personas.",
  },
  {
    kind: "moved",
    icon: ArrowLeftRight,
    label: "Movido",
    tenths: 298,
    percent: 55,
    detail: "A tu inversión, tus tarjetas y tus cuentas. Sigue siendo tuyo.",
  },
];

/** Real spending by category, largest first (v8-05). */
export const CATEGORIES = [
  { icon: Landmark, label: "Créditos", amount: "$4,62M", share: 19, count: 3 },
  {
    icon: ShoppingBag,
    label: "Mercado",
    amount: "$4,10M",
    share: 17,
    count: 26,
  },
  { icon: Banknote, label: "Efectivo", amount: "$3,15M", share: 13, count: 17 },
  {
    icon: Utensils,
    label: "Restaurantes y domicilios",
    amount: "$2,35M",
    share: 10,
    count: 31,
  },
] as const;

/** Recurring payments (v8-04); `months` are July to September, to scale. */
export const RECURRING = [
  {
    icon: Landmark,
    label: "Cuotas de tu crédito",
    raw: "PAGO PSE Financiera Andes S",
    when: "Mensual · entre el 1 y el 4",
    channel: "PSE",
    amount: "−$1.851.000",
    months: [1, 1, 1],
    rose: false,
  },
  {
    icon: Zap,
    label: "Energía",
    raw: "PAGO PSE Electrificadora de",
    when: "Mensual · entre el 14 y el 16",
    channel: "PSE",
    amount: "−$182.000",
    months: [0.89, 0.94, 1],
    rose: true,
  },
  {
    icon: Wifi,
    label: "Internet y TV",
    raw: "PAGO PSE HOGAR CONECTADO SA",
    when: "Mensual · día 5",
    channel: "PSE",
    amount: "−$129.900",
    months: [1, 1, 1],
    rose: false,
  },
  {
    icon: Activity,
    label: "Gimnasio",
    raw: "COMPRA EN  GIMNASIO FIT",
    when: "Mensual · día 10",
    channel: "Débito",
    amount: "−$110.000",
    months: [1, 1, 1],
    rose: false,
  },
] as const;

type Movement = {
  icon: LucideIcon;
  kind: Kind;
  /** The bank's text, exactly as printed. */
  raw: string;
  category: string;
  channel: string;
  amount: string;
};

/** Movements as the bank writes them, with what they were and their channel. */
export const MOVEMENTS: readonly Movement[] = [
  {
    icon: Zap,
    kind: "spending",
    raw: "PAGO PSE Electrificadora de",
    category: "Servicios del hogar",
    channel: "PSE",
    amount: "−$182.000",
  },
  {
    icon: Users,
    kind: "spending",
    raw: "TRANSFERENCIAS A NEQUI",
    category: "Pagos a personas",
    channel: "Nequi",
    amount: "−$90.000",
  },
  {
    icon: CreditCard,
    kind: "moved",
    raw: "PAGO SUC VIRT TC MASTER PESOS",
    category: "Pago de tu tarjeta",
    channel: "Sucursal virtual",
    amount: "−$1.250.000",
  },
  {
    icon: Banknote,
    kind: "spending",
    raw: "RETIRO CAJERO ATM HALL CENTRO",
    category: "Efectivo",
    channel: "Cajero",
    amount: "−$200.000",
  },
  {
    icon: Download,
    kind: "income",
    raw: "PAGO INTERBANC SISTEMAS COLOMB",
    category: "Transferencias recibidas",
    channel: "Transferencia",
    amount: "+$31.540.200",
  },
];
