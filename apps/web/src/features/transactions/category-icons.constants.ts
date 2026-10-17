import type { CategoryId } from "@xtrakto/core";
import {
  ArrowLeftRight,
  Banknote,
  Car,
  Clapperboard,
  CreditCard,
  Download,
  Ellipsis,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  House,
  KeyRound,
  Landmark,
  type LucideIcon,
  Package,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Users,
  Utensils,
} from "lucide-react";

/**
 * Each category's icon (design-system.md §8): money in comes down, money
 * that only moved goes both ways, and spending shows what it bought.
 */
export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  groceries: ShoppingBag,
  restaurants: Utensils,
  transport: Car,
  utilities: House,
  housing: KeyRound,
  health: Heart,
  education: GraduationCap,
  entertainment: Clapperboard,
  shopping: Package,
  subscriptions: Repeat,
  loan_payment: Landmark,
  transfers_to_people: Users,
  payment_gateways: Globe,
  cash_withdrawal: Banknote,
  taxes_and_fees: FileText,
  other_spending: Ellipsis,
  income_transfer: Download,
  interest: Download,
  deposit: Download,
  refund: Download,
  other_income: Download,
  own_account_transfer: ArrowLeftRight,
  credit_card_payment: CreditCard,
  investment: TrendingUp,
};

/** A movement no rule knows, or whose category the table no longer has. */
export const UNKNOWN_CATEGORY_ICON = Ellipsis;

/** Each kind's icon on its tile (§8). */
export const KIND_ICONS = {
  income: Download,
  spending: ShoppingCart,
  moved: ArrowLeftRight,
} as const satisfies Record<string, LucideIcon>;

/** Each tone's icon chip and amount colors (§3.4, §9). */
export const TONE_CLASSES = {
  income: {
    chip: "bg-income-soft text-income-text",
    amount: "text-income-text",
  },
  spending: {
    chip: "bg-spending-soft text-spending-text",
    amount: "text-spending-text",
  },
  moved: { chip: "bg-moved-soft text-moved-text", amount: "text-moved-text" },
  neutral: { chip: "bg-surface-muted text-ink", amount: "text-ink" },
} as const;
