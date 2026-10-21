import {
  Calendar,
  ChartPie,
  LayoutGrid,
  List,
  type LucideIcon,
  Upload,
} from "lucide-react";
import type { Route } from "next";

// The Spanish copy and the navigation of the app shell (design-system.md §9).

export const HEADER_COPY = {
  home: "Xtrakto, inicio",
  tagline: "Cuentas claras, mente tranquila",
  privacy: "Tus datos son privados",
  settings: "Configuración",
  navigation: "Navegación principal",
} as const;

// What a page that failed says: what happened and what to do (v8-13).
export const PAGE_ERROR_COPY = {
  title: "No pudimos mostrar esta página",
  detail: "Puede ser algo pasajero. Inténtalo de nuevo en un momento.",
  retry: "Intentar de nuevo",
} as const;

type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Other pages the item stands for, as the quick review for Resumen (v8-02). */
  alsoActiveOn?: readonly Route[];
};

// Only the routes that exist; Pregúntale arrives with its stage, and the
// settings live in the avatar's menu.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Resumen", icon: LayoutGrid, alsoActiveOn: ["/review"] },
  { href: "/transactions", label: "Movimientos", icon: List },
  { href: "/recurring", label: "Pagos fijos", icon: Calendar },
  { href: "/categories", label: "Categorías", icon: ChartPie },
  { href: "/upload", label: "Subir", icon: Upload },
];
