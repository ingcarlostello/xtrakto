import type {
  CategoryId,
  PeriodSummary,
  UserCategoryRule,
} from "@xtrakto/core";
import type { PeriodMovement } from "@xtrakto/db";
import type { InsightTileProps } from "@/components/insight-tile/InsightTile";
import type { PeriodChoices } from "@/components/period-controls/period-controls.types";

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
