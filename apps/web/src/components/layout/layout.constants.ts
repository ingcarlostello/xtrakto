import {
  Calendar,
  ChartPie,
  LayoutGrid,
  List,
  type LucideIcon,
  Upload,
  User,
} from "lucide-react";
import type { Route } from "next";

// The Spanish copy and the navigation of the app shell (design-system.md §9).

export const HEADER_COPY = {
  home: "Xtrakto, inicio",
  tagline: "Cuentas claras, mente tranquila",
  privacy: "Tus datos son privados",
  navigation: "Navegación principal",
  more: "Más",
} as const;

// What a page that failed says: what happened and what to do (v8-13).
export const PAGE_ERROR_COPY = {
  title: "No pudimos mostrar esta página",
  detail: "Puede ser algo pasajero. Inténtalo de nuevo en un momento.",
  retry: "Intentar de nuevo",
} as const;

export type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Other pages the item stands for, as the quick review for Resumen (v8-02). */
  alsoActiveOn?: readonly Route[];
  /** On phones it waits under "Más", since the bar fits five (v8-11). */
  isUnderMore?: boolean;
};

// Only the routes that exist; Pregúntale arrives with its stage, before
// "Más" on phones, and nothing else moves.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Resumen", icon: LayoutGrid, alsoActiveOn: ["/review"] },
  { href: "/transactions", label: "Movimientos", icon: List },
  {
    href: "/recurring",
    label: "Pagos fijos",
    icon: Calendar,
    isUnderMore: true,
  },
  {
    href: "/categories",
    label: "Categorías",
    icon: ChartPie,
    isUnderMore: true,
  },
  { href: "/upload", label: "Subir", icon: Upload },
  { href: "/profile", label: "Perfil", icon: User, isUnderMore: true },
];

// A dock item, and the one of the page open (design-system.md §9): NavLink's
// links and the "Más" button look the same. Up to md the pill's six items
// go without their minimum width, so they fit at 640px.
export const NAV_ITEM_CLASS =
  "flex min-h-11 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-center text-[11px] font-semibold tracking-tight text-ink transition-colors hover:bg-surface-muted sm:w-auto sm:px-2.5 sm:py-2.5 sm:text-sm sm:tracking-normal md:min-w-[86px] md:px-3.5 [&_svg]:size-[22px]";
export const ACTIVE_NAV_ITEM_CLASS =
  "bg-primary-soft-2 font-bold text-primary hover:bg-primary-soft-2";
