import type {
  CategoryId,
  PeriodSummary,
  UserCategoryRule,
} from "@xtrakto/core";
import type { PeriodMovement, TransactionListItem } from "@xtrakto/db";
import type { InsightTileProps } from "@/components/insight-tile/InsightTile";
import type { PeriodChoices } from "@/components/period-controls/period-controls.types";
import type { transactionsHref } from "@/utils/transactions-url.helpers";

/** An account's categories in a period, as the page reads them. */
export type AccountCategories = PeriodChoices & {
  /** Its movements that count, the oldest first. */
  readonly movements: readonly PeriodMovement[];
  readonly summary: PeriodSummary;
  /** The user's own, for every account and statement. */
  readonly rules: readonly UserCategoryRule[];
};

/** A row of "Tu gasto real por categoría" (docs/ui/v8-05). */
export type SpendingRow = {
  readonly categoryId: CategoryId;
  /** "Créditos". */
  readonly label: string;
  /** "$4,6M", "$19.760". */
  readonly amount: string;
  /** Its bar, as a share of the largest category's, in percent. */
  readonly barPercent: number;
  /** "19% de tu gasto real · 3 movimientos · PSE". */
  readonly note: string;
};

/** A row of "Movido no es gasto": where money moved, or what came back. */
export type MovedRow = {
  readonly key: string;
  /** Whose icon its chip shows. */
  readonly categoryId: CategoryId;
  /** "A tu inversión", "Volvió de tus cuentas". */
  readonly label: string;
  /** "−$22,0M", "+$2,8M". */
  readonly amount: string;
  /** Money out's bar, as a share of the most that went out, in percent. */
  readonly barPercent?: number;
  /** What came back says it isn't income. */
  readonly note?: string;
};

/** "Movido no es gasto" (docs/ui/v8-05). */
export type MovedView = {
  /** "Salieron $29,8M y volvieron $2,8M. Todo sigue siendo tuyo." */
  readonly subtitle: string;
  readonly rows: readonly MovedRow[];
};

/** A rule of "Tus reglas": what it holds for, and what it says. */
export type RuleRow = {
  readonly key: string;
  /** "TRANSF A ANA LUCIA MAR", or "ref ••• 1270". */
  readonly text: string;
  /** "Si sale: Entre tus cuentas · movido". */
  readonly meaning: string;
};

/** The page's gateways tile, an insight tile on the attention surface. */
export type GatewaysTile = InsightTileProps;

/** A category of real spending in an account's period, as its detail reads it (6.8b). */
export type CategoryDetail = PeriodChoices & {
  readonly categoryId: CategoryId;
  /** Every movement of the period that counts, the oldest first. */
  readonly movements: readonly PeriodMovement[];
  readonly summary: PeriodSummary;
  /** The category's newest movements, the newest first. */
  readonly latest: readonly TransactionListItem[];
  /** The user's rules that give the category. */
  readonly rules: readonly UserCategoryRule[];
};

/** A figure of a category's detail (docs/ui/v8-06): "Total del trimestre". */
export type CategoryFigure = {
  readonly label: string;
  /** "$2,4M", "$75.852". */
  readonly amount: string;
  /** "31 movimientos · 10% de tu gasto real." */
  readonly note: string;
};

/** What a category took in one month of a quarter. */
export type MonthBox = {
  /** "2026-07". */
  readonly key: string;
  /** "Julio". */
  readonly label: string;
  /** "$710 mil". */
  readonly amount: string;
  /** The month it took the most, when there are several. */
  readonly isMost: boolean;
};

/** The tiles of a category's detail (docs/ui/v8-06). */
export type CategoryTiles = {
  readonly total: CategoryFigure;
  readonly average: CategoryFigure;
  /** A quarter's months with movements; none for a month. */
  readonly months: readonly MonthBox[];
};

/** One of a category's newest movements, as its detail lists it. */
export type LatestRow = {
  readonly id: string;
  /** The bank's text as printed, or that it gave none. */
  readonly title: string;
  /** False for the bank's `0`, titled "Sin descripción del banco". */
  readonly hasDescription: boolean;
  /** "27 de septiembre". */
  readonly date: string;
  readonly channel: string | undefined;
  /** Its category is only a guess, waiting for the quick review. */
  readonly isPendingReview: boolean;
  /** "−$48.900". */
  readonly amount: string;
  /** Its detail, in Movimientos, among the category's movements. */
  readonly href: ReturnType<typeof transactionsHref>;
};

/** "Mostrando 4 de 31" and "Ver los 31 movimientos", in Movimientos. */
export type LatestFooter = {
  readonly status: string;
  readonly label: string;
  readonly href: ReturnType<typeof transactionsHref>;
};

/** "Ajustes de esta categoría": what it counts as and the user's rules for it. */
export type CategorySettings = {
  /** "Efectivo siempre suma a tu gasto real." */
  readonly countsAs: string;
  /** "2 reglas tuyas", or that there are none. */
  readonly rulesTitle: string;
  /** Their bank texts and numbers, or how the user makes one. */
  readonly rulesNote: string;
  readonly hasRules: boolean;
};
